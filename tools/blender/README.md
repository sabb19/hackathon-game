# Modelli fatti in Blender

Rigenerare (Blender 4.1+):

    /Applications/Blender.app/Contents/MacOS/Blender -b --python tools/blender/crt.py -- public/assets/models/custom/crt.glb /tmp/crt.png
    /Applications/Blender.app/Contents/MacOS/Blender -b --python tools/blender/phone.py -- public/assets/models/custom/phone.glb /tmp/phone.png

Il secondo argomento è un render di anteprima. Nel CRT la mesh "Screen" riceve in gioco la texture viva di RELAY.
