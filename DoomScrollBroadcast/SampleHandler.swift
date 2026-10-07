import ReplayKit
import OSLog

final class SampleHandler: RPBroadcastSampleHandler {
    private let logger = Logger(subsystem: "com.paritosh404.doomscroll.broadcast", category: "capture")
    private var videoFrameCount: UInt64 = 0

    override func broadcastStarted(withSetupInfo setupInfo: [String: NSObject]?) {
        videoFrameCount = 0
        logger.notice("Broadcast started")
    }

    override func broadcastPaused() {
        logger.notice("Broadcast paused")
    }

    override func broadcastResumed() {
        logger.notice("Broadcast resumed")
    }

    override func broadcastFinished() {
        logger.notice("Broadcast finished after \(self.videoFrameCount) video frames")
    }

    override func processSampleBuffer(_ sampleBuffer: CMSampleBuffer,
                                      with sampleBufferType: RPSampleBufferType) {
        guard sampleBufferType == .video,
              CMSampleBufferIsValid(sampleBuffer),
              CMSampleBufferGetImageBuffer(sampleBuffer) != nil else { return }
        videoFrameCount &+= 1
        if videoFrameCount == 1 || videoFrameCount % 300 == 0 {
            logger.notice("Received \(self.videoFrameCount) video frames")
        }
        // Capture-only prototype. Do not retain, persist, or transmit the buffer.
    }
}
