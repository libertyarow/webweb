import * as d3 from 'd3'

export class NodeKey {
  get nonMetadataKeys() {
    return [
      'degree',
      'strength',
      'fx',
      'fy',
      'idx',
      'index',
      'vx',
      'vy',
      'x',
      'y',
    ]
  }

  isNonMetadataKey(key) {
    return this.nonMetadataKeys.indexOf(key) >= 0 ? true : false
  }

  isMetadataKey(key, obj) {
    if (this.isNonMetadataKey(key)) {
      return false
    }

    if (obj !== undefined) {
      let attribute = obj[key];
      if (attribute !== undefined && {}.toString.call(attribute) !== '[object Function]') {
        return true
      }
    }
    else {
      return true
    }

    return false
  }

  filterMetadataKeys(keys, obj) {
    return keys.filter((key) => this.isMetadataKey(key, obj), this)
  }

  setMetadataOntoObject(key, obj, metadata) {
    let type = metadata.type
    if (type !== undefined) {
      if (type == 'categorical') {
        if (metadata.categories !== undefined) {
          var nodeCategoryNumber = obj[key]
          if (isInt(nodeCategoryNumber)) {
            obj[key] = metadatum.categories[nodeCategoryNumber];
          }
        }
      }
      else if (type == 'binary') {
        obj[key] = obj[key] ? true : false;
      }
    }
  }
}


export class Node {
  constructor(idx) {
    this.idx = idx
    this.settings = null
    this.nodeKeyer = NodeKey()
  }

  set settings(settings) {
    this.settings = settings
  }

  setMetadata() {
    for (let key of nodeKeyer.filterMetadataKeys(Object.keys(this), this)) {
      if (this.settings.metadata !== undefined && this.display.metadata[key] !== undefined) {
        let metadatumInfo = this.display.metadata[key]

        let value = this[key]

        // if we have categories, change the node values here
        if (metadatumInfo.categories !== undefined) {
          if (isInt(value)) {
            var nodeCategoryNumber = this.nodes[i][key];
            this[key] = metadatumInfo.categories[nodeCategoryNumber];
          }
        }
        else if (metadatumInfo.type !== undefined && metadatumInfo.type == 'binary') {
          this[key] = value ? true : false;
        }
      }
    }
  }

  resetMetadata() {
    this.metadataKeys.forEach((key) => {
      delete this[key]
    }, this)

    this.degree = 0
    this.strength = 0
  }

  get radius() {
    if (this.fixedRadius) {
      return this.fixedRadius;
    }

    let radius = this.__scaledSize * this.settings.r;
    if (this.matchesString() || this.containsMouse(radius)) {
      radius *= 1.3;
    }

    return radius;
  }

  matchesString() {
    let matchString = this.settings.nameToMatch;
    if (matchString !== undefined && matchString.length > 0) {
        if (this.name !== undefined && this.name.indexOf(matchString) >= 0) {
            return true;
        }
    }
    
    return false
  }

  containsMouse(mouseState, radius) {
    if (mouseState == undefined) {
        return false
    }

    // recursion...
    if (radius == undefined) {
      radius = 1.3 * this.radius
    }

    if (
      this.x + radius >= mouseState.x &&
      this.x - radius <= mouseState.x &&
      this.y + radius >= mouseState.y &&
      this.y - radius <= mouseState.y
    ) {
      return true
    }

    return false
  }

  get outline() {
    if (this.matchesString() || this.containsMouse()) {
      return "black"
    }
    else {
      return d3.rgb(255, 255, 255)
    }
  }

  get nodeText() {
    let radius = this.radius;
    if (! this.nonInteractive) {
      if (this.matchesString() || settings.showNodeNames || this.containsMouse(radius)) {
        if (webweb.simulation.alpha() < .05 || webweb.display.freezeNodeMovement) {
          let text = this.name || this.idx;
          let textX = this.x + 1.1 * radius;
          let textY = this.y - 1.1 * radius;
          let font = "12px";
          return new Text(text, textX, textY, font);
        }
      }
    }
  }
  draw(ctx) {
    var radius = this.radius();
    ctx.beginPath();
    ctx.arc(this.x, this.y, radius, 0, Math.PI * 2, false)
    ctx.strokeStyle = this.outline;
    ctx.stroke();
    ctx.fillStyle = d3.rgb(this.__scaledColor);
    ctx.fill();
  }
  drawSVG() {
    var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttributeNS(null, 'cx', this.x)
    circle.setAttributeNS(null, 'cy', this.y)
    circle.setAttributeNS(null, 'r', this.radius())
    circle.setAttributeNS(null, 'style', 'fill: ' + d3.rgb(this.__scaledColor) + '; stroke: ' + this.outline() + ';' )

    return circle
  }
}

function isInt(n){
    return Number(n) === n && n % 1 === 0;
}