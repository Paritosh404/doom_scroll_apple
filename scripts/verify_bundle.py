"""Verify the browser app and its filter before and after IPA packaging."""
import plistlib
import sys
from pathlib import Path


def verify(app):
    with (app / "Info.plist").open("rb") as source:
        info = plistlib.load(source)
    assert info["CFBundleIdentifier"] == "com.paritosh404.doomscroll"
    assert info["CFBundlePackageType"] == "APPL"
    executable = info["CFBundleExecutable"]
    assert Path(executable).name == executable
    binary = app / executable
    assert binary.is_file() and binary.stat().st_size > 0, "Missing app executable"
    script = app / "InstagramFilter.js"
    assert script.is_file() and script.stat().st_size > 0, "Missing browsing filter"
    assert not list(app.rglob("*.appex")), "Recording extensions must not ship"
    print(f"Verified focus browser and bundled filter: {app}")


if __name__ == "__main__":
    try:
        if len(sys.argv) != 2:
            raise ValueError("Usage: verify_bundle.py PATH/TO/DoomScroll.app")
        verify(Path(sys.argv[1]))
    except (OSError, ValueError, KeyError, AssertionError) as error:
        sys.exit(f"Bundle verification failed: {error}")
