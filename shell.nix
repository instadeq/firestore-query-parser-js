{ pkgs ? import (fetchTarball "https://github.com/NixOS/nixpkgs/archive/nixos-21.11.tar.gz") {} }:
with pkgs;

mkShell {
  LOCALE_ARCHIVE_2_27 = "${glibcLocales}/lib/locale/locale-archive";
  buildInputs = [
    glibcLocales
    gnumake
    pkgs.nodejs-14_x
  ];
  shellHook = ''
    export LC_ALL=en_US.UTF-8
    export PATH=$PWD/node_modules/.bin:$PATH
  '';
}
