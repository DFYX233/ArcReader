!macro customInstall
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.pdf\shell\ArcReader" "" "使用 ArcReader 打开"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.pdf\shell\ArcReader" "Icon" "$INSTDIR\ArcReader.exe"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.pdf\shell\ArcReader" "Position" "Top"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.pdf\shell\ArcReader\command" "" '"$INSTDIR\ArcReader.exe" "%1"'
!macroend

!macro customUnInstall
  DeleteRegKey HKCU "Software\Classes\SystemFileAssociations\.pdf\shell\ArcReader"
!macroend
