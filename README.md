# wm
window manager written in javascript

sure, ~~you sometimes have to Mod4+click a window to get it to focus~~

~~and~~ it doesn't do (real) tiling

and the code is all over the place

and ~~sometimes you have to switch to a tty to tell it to
refocus the root window~~

but every keybinding is bound to just a program, just any
executable file in `PATH` be it firefox or wireshark or
its own internal programs

here's an example of a `~/.wmrc`:

```ini
[keybindings]
M-return = termite
M-A-e = rofi-emoji
M-A-p = rofi-pass
M-space = rofi -show drun -display-drun '' -font 'source code pro 20'  -separator-style 'none'
XF86AudioLowerVolume = ponymix decrease 10 -N
XF86AudioRaiseVolume = ponymix increase 10 -N

# window move workspaces
M-S-1 = window workspace 1
M-S-2 = window workspace 2
M-S-3 = window workspace 3
M-S-4 = window workspace 4
M-S-5 = window workspace 5
M-S-6 = window workspace 6
M-S-7 = window workspace 7
M-S-8 = window workspace 8
M-S-9 = window workspace 9
M-S-0 = window workspace 10
M-S-minus = window workspace 11
M-S-equal = window workspace 12

# workspace switch
M-1 = workspace switch 1
M-2 = workspace switch 2
M-3 = workspace switch 3
M-4 = workspace switch 4
M-5 = workspace switch 5
M-6 = workspace switch 6
M-7 = workspace switch 7
M-8 = workspace switch 8
M-9 = workspace switch 9
M-0 = workspace switch 10
M-minus = workspace switch 11
M-equal = workspace switch 12

# window resize
M-A-h = window resize x-10
M-A-j = window resize y+10
M-A-k = window resize y-10
M-A-l = window resize x+10

# window move
M-C-h = window move x-10
M-C-j = window move y+10
M-C-k = window move y-10
M-C-l = window move x+10

# window tile
M-A-comma = window tile left
M-A-period = window tile right
M-A-f = window tile full
M-A-q = window tile top-left
M-A-w = window tile top-right
M-A-a = window tile bottom-left
M-A-s = window tile bottom-right

# window misc
M-period = window toggle-pinning

[settings]
workspaces = 10
```

now you notice `window workspace 1` and `workspace switch 1`
etc

those are just commands as well that live in the wm/bin
directory, which is prepended to `PATH` before keybound
commands are executed

and all those little programs do is write to the socket=
living at /tmp/wm, which the window manager is listening
on and accepts commands to

## keybinding format

modifier keys are uppercase:

* M: super key (windows key/cmd)
* S: shift
* C: control
* A: alt

all letters are lower case. special keys available so far
are `space`, `return`, `period` and `comma` and `tab`.
also supports media keys (play, next, prev, kbd brightness (up|down),
brightness).
