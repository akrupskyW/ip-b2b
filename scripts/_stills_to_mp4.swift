// _stills_to_mp4.swift — encode a numbered folder of stills into an H.264 mp4.
//
// This machine has no ffmpeg, so the film is written through AVFoundation
// instead. Frames are read in filename order and stamped at a fixed rate, so
// the caller controls timing entirely by how many frames it renders.
//
//   swiftc -O scripts/_stills_to_mp4.swift -o /tmp/stills2mp4
//   /tmp/stills2mp4 <frames-dir> <out.mp4> <fps>

import AVFoundation
import CoreGraphics
import Foundation
import ImageIO

let args = CommandLine.arguments
guard args.count >= 4, let fps = Int32(args[3]) else {
    FileHandle.standardError.write("usage: stills2mp4 <frames-dir> <out.mp4> <fps>\n".data(using: .utf8)!)
    exit(2)
}
let dir = args[1]
let outPath = args[2]

func fail(_ msg: String) -> Never {
    FileHandle.standardError.write("stills2mp4: \(msg)\n".data(using: .utf8)!)
    exit(1)
}

func loadImage(_ path: String) -> CGImage? {
    guard let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: path) as CFURL, nil) else { return nil }
    return CGImageSourceCreateImageAtIndex(src, 0, nil)
}

let fm = FileManager.default
guard let names = try? fm.contentsOfDirectory(atPath: dir) else { fail("cannot read \(dir)") }
let frames = names.filter { $0.hasSuffix(".jpg") }.sorted().map { dir + "/" + $0 }
guard let first = frames.first, let probe = loadImage(first) else { fail("no frames in \(dir)") }
let W = probe.width
let H = probe.height

if fm.fileExists(atPath: outPath) { try? fm.removeItem(atPath: outPath) }
guard let writer = try? AVAssetWriter(outputURL: URL(fileURLWithPath: outPath), fileType: .mp4) else {
    fail("cannot open \(outPath) for writing")
}

let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: W,
    AVVideoHeightKey: H,
    AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: 5_000_000,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
        AVVideoMaxKeyFrameIntervalKey: Int(fps) * 2,
    ] as [String: Any],
])
input.expectsMediaDataInRealTime = false

let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
    kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_32BGRA),
    kCVPixelBufferWidthKey as String: W,
    kCVPixelBufferHeightKey as String: H,
])
guard writer.canAdd(input) else { fail("writer rejected the video input") }
writer.add(input)
guard writer.startWriting() else { fail("startWriting failed: \(String(describing: writer.error))") }
writer.startSession(atSourceTime: .zero)

let space = CGColorSpaceCreateDeviceRGB()
let bitmap = CGImageAlphaInfo.noneSkipFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue
let appended = DispatchSemaphore(value: 0)
var next = 0

input.requestMediaDataWhenReady(on: DispatchQueue(label: "wise.stills2mp4")) {
    while input.isReadyForMoreMediaData {
        if next >= frames.count {
            input.markAsFinished()
            appended.signal()
            return
        }
        let path = frames[next]
        guard let img = loadImage(path) else { fail("cannot decode \(path)") }
        guard let pool = adaptor.pixelBufferPool else { fail("no pixel buffer pool") }
        var maybe: CVPixelBuffer?
        guard CVPixelBufferPoolCreatePixelBuffer(nil, pool, &maybe) == kCVReturnSuccess,
              let buffer = maybe else { fail("cannot allocate a pixel buffer") }
        CVPixelBufferLockBaseAddress(buffer, [])
        if let ctx = CGContext(data: CVPixelBufferGetBaseAddress(buffer),
                               width: W, height: H, bitsPerComponent: 8,
                               bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
                               space: space, bitmapInfo: bitmap) {
            ctx.draw(img, in: CGRect(x: 0, y: 0, width: W, height: H))
        }
        CVPixelBufferUnlockBaseAddress(buffer, [])
        adaptor.append(buffer, withPresentationTime: CMTime(value: CMTimeValue(next), timescale: fps))
        next += 1
    }
}
appended.wait()

let finished = DispatchSemaphore(value: 0)
writer.finishWriting { finished.signal() }
finished.wait()
guard writer.status == .completed else { fail("encode failed: \(String(describing: writer.error))") }

var bytes = 0
if let attrs = try? fm.attributesOfItem(atPath: outPath), let n = attrs[.size] as? Int { bytes = n }
let secs = Double(frames.count) / Double(fps)
print(String(format: "wrote %@ — %d frames, %.1fs @ %dfps, %dx%d, %d KB",
             outPath, frames.count, secs, Int(fps), W, H, bytes / 1024))
