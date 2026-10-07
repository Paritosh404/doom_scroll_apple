"""Fail packaging if the built app lacks a usable ReplayKit upload extension."""
import plistlib
import sys
from pathlib import Path


def require(condition, message):
    if not condition:
        raise ValueError(message)


def read_bundle(path, package_type):
    with (path / "Info.plist").open("rb") as source:
        info = plistlib.load(source)
    require(info.get("CFBundlePackageType") == package_type,
            f"Incorrect package type: {path}")
    executable = info.get("CFBundleExecutable", "")
    require(executable and Path(executable).name == executable,
            f"Invalid executable name: {path}")
    binary = path / executable
    require(binary.is_file() and binary.stat().st_size > 0,
            f"Missing or empty executable: {binary}")
    return info


def verify(app):
    host = read_bundle(app, "APPL")
    extension = app / "PlugIns" / "DoomScrollBroadcast.appex"
    upload = read_bundle(extension, "XPC!")
    require(host.get("CFBundleIdentifier") == "com.paritosh404.doomscroll",
            "Unexpected host bundle identifier")
    require(upload.get("CFBundleIdentifier") == host["CFBundleIdentifier"] + ".broadcast",
            "Extension identifier must match the host prefix")
    for key in ("CFBundleShortVersionString", "CFBundleVersion"):
        require(host.get(key) and host[key] == upload.get(key),
                f"Host and extension versions differ: {key}")
    configuration = upload.get("NSExtension", {})
    require(configuration.get("NSExtensionPointIdentifier") ==
            "com.apple.broadcast-services-upload", "Wrong extension point")
    require(configuration.get("NSExtensionPrincipalClass") ==
            "DoomScrollBroadcast.SampleHandler", "Incorrect sample handler class")
    require(configuration.get("RPBroadcastProcessMode") ==
            "RPBroadcastProcessModeSampleBuffer", "Sample-buffer mode is missing")
    require("NSExtensionMainStoryboard" not in configuration,
            "Upload extension must use its sample handler, not a storyboard")
    print(f"Verified embedded ReplayKit extension: {extension}")


if __name__ == "__main__":
    try:
        require(len(sys.argv) == 2, "Usage: verify_bundle.py PATH/TO/DoomScroll.app")
        verify(Path(sys.argv[1]))
    except (OSError, ValueError, plistlib.InvalidFileException) as error:
        sys.exit(f"Bundle verification failed: {error}")
