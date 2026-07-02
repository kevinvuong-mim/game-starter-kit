import UIKit
import Capacitor

class FullscreenBridgeViewController: CAPBridgeViewController {
    override var prefersStatusBarHidden: Bool {
        return true
    }
}
