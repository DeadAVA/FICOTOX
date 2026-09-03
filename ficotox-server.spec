# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['C:\\Users\\alanv\\Desktop\\FICOTOX\\backend\\server_launcher_flask.py'],
    pathex=['C:\\Users\\alanv\\Desktop\\FICOTOX\\backend'],
    binaries=[],
    datas=[('C:\\Users\\alanv\\Desktop\\FICOTOX\\frontend', 'frontend')],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='ficotox-server',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
