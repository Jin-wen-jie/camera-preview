' DeepSeek Image Filter Proxy - 静默启动 (无窗口)
' 开机自启时通过此脚本启动，不会弹出命令行窗口
' 如果代理已在运行，proxy.js 检测到端口占用会自动退出

On Error Resume Next

Dim WshShell, objWMIService, colProcesses
Set WshShell = CreateObject("WScript.Shell")

' 切换到脚本所在目录
WshShell.CurrentDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)

' 静默启动 node proxy.js（第二个参数 0 = 隐藏窗口）
WshShell.Run "node proxy.js > nul 2>&1", 0, False

Set WshShell = Nothing
