' 创建开机自启快捷方式
On Error Resume Next

Dim WshShell, startupPath, shortcutPath, targetPath, workDir
Set WshShell = CreateObject("WScript.Shell")

startupPath = WshShell.SpecialFolders("Startup")
shortcutPath = startupPath & "\DeepSeek-Filter-Proxy.lnk"
targetPath = "C:\Users\32398\Documents\人机交互\tools\filter-proxy\start-silent.vbs"
workDir = "C:\Users\32398\Documents\人机交互\tools\filter-proxy"

Set Shortcut = WshShell.CreateShortcut(shortcutPath)
Shortcut.TargetPath = targetPath
Shortcut.WorkingDirectory = workDir
Shortcut.Description = "DeepSeek 图片过滤代理 - 自动过滤 image_url"
Shortcut.Save()

If Err.Number = 0 Then
    WScript.Echo "SUCCESS: 快捷方式已创建!" & vbCrLf & shortcutPath
Else
    WScript.Echo "FAILED: " & Err.Description
End If

Set Shortcut = Nothing
Set WshShell = Nothing
