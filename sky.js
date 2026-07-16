class Sky {
  constructor(u, h) {
    I(this, "color");
    ((this.gameScene = u), (this.sun = h));
  }
  update() {
    const u =
      (Math.pow(Math.abs(this.sun.offset.y), 0.3) /
        Math.pow(this.sun.sunDist, 0.3)) *
      100;
    (this.sun.offset.y > 0
      ? (this.color = new Color$1(
          LinearColorInterpolator.findColorBetween(sunrise, noon, u).asRgbCss(),
        ))
      : (this.color = new Color$1(
          LinearColorInterpolator.findColorBetween(
            sunrise,
            midnight,
            u,
          ).asRgbCss(),
        )),
      (this.gameScene.scene.background = this.color));
  }
}
