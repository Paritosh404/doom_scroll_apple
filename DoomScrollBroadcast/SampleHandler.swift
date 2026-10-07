import ReplayKit

final class SampleHandler: RPBroadcastSampleHandler {
    private var videoFrameCount = 0

    override func broadcastStarted(withSetupInfo setupInfo: [String : NSObject]?) {
        videoFrameCount = 0
    }

    override func broadcastPaused() {}
    override func broadcastResumed() {}
    override func broadcastFinished() {}

    override func processSampleBuffer(_ sampleBuffer: CMSampleBuffer,
                                      with sampleBufferType: RPSampleBufferType) {
        guard sampleBufferType == .video else { return }
        videoFrameCount += 1
        if videoFrameCount % 300 == 0 {
            NSLog("DoomScroll Broadcast received %d video frames", videoFrameCount)
        }
    }
}
