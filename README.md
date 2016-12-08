# wm
window manager written in javascript

sure, you sometimes have to Mod4+click a window to get it to focus

and it doesn't do tiling

and the code is all over the place and mad

and sometimes you have to switch to a tty to tell it to refocus the root window

but every keybinding is bound to just a program, just any executable file in `PATH` be it firefox or its own internal programs

here's an example `~/.wmrc`:

```ini
[keybindings]
M-return = termite
M-p = rofi-pass
M-space = rofi -show drun -display-drun '' -font 'source code pro 20'	-separator-style 'none'
XF86AudioLowerVolume = ponymix decrease 10 -N
XF86AudioRaiseVolume = ponymix increase 10 -N

# window move
M-S-1 = window move 1
M-S-2 = window move 2
M-S-3 = window move 3
M-S-4 = window move 4
M-S-5 = window move 5

# workspace switch
M-1 = workspace switch 1
M-2 = workspace switch 2
M-3 = workspace switch 3
M-4 = workspace switch 4
M-5 = workspace switch 5
```

now you notice `window move 1` and `workspace switch 1` etc

those are just commands as well that live in the wm/bin directory, which is prepended to `PATH` before keybound commands are executed

and all those little programs do is write to the socket= living at /tmp/wm, which the window manager is listening on and accepts commands to

