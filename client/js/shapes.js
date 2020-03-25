import * as svgUtils from './svg_utils'

export class Circle {
  constructor(x, y, radius, outline, color, opacity) {
    this.x = x
    this.y = y
    this.radius = radius
    this.outline = outline
    this.color = color
  }


  draw(context) {
    context.beginPath()
    context.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false)
    context.strokeStyle = this.outline
    context.stroke()
    context.fillStyle = this.color
    context.fill()
  }

  drawSVG() {
    return svgUtils.drawCircle(this.x, this.y, this.radius, this.outline, this.color)
  }

}

export class Line {
  constructor(x1, y1, x2, y2, width, opacity, color) {
    this.x1 = x1
    this.y1 = y1
    this.x2 = x2
    this.y2 = y2
    this.width = width
    this.opacity = opacity
    this.color = color
  }

  draw(context) {
    context.save()
    context.globalAlpha = this.opacity
    context.beginPath()
    context.moveTo(this.x1, this.y1)
    context.lineTo(this.x2, this.y2)
    context.lineWidth = this.width
    context.strokeStyle = this.color
    context.stroke()
    context.restore()
  }

  drawSVG() {
    return svgUtils.drawLine(
      this.target.x, this.target.y, this.source.x, this.source.y,
      this.color, this.opacity, this.width
    )
  }
}