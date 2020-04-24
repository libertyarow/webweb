import * as widgets from './widget'
import * as parameters from './parameters'
import { NoneAttribute } from './attribute'

export class SettingsHandler {
  constructor(parameterDefinitions, settings, callHandler) {
    this.parameters = {}
    this.attributeParameters = {}
    Object.entries(parameterDefinitions).forEach(([key, definition]) => {
      if (AttributeParameterGroup.isType(definition)) {
        const group = new AttributeParameterGroup(key, settings, definition)
        this.attributeParameters[key] = group

        Object.values(group.parameters).forEach(parameter => {
          this.parameters[parameter.key] = parameter
        })
      }
      else {
        this.parameters[key] = new Parameter(key, settings, definition)
      }
    })

    this.widgets.forEach(widget => widget.callHandler = callHandler)

    this.updateSettings(settings)
  }

  removeFromSettingsAndMenu(settings, menu) {
    menu.removeWidgets(this.widgets)
    return this.undefaultSettings(settings)
  }

  undefaultSettings(settings) {
    Object.values(this.parameters).forEach(parameter => {
      if (parameter.defaultedSetting) {
        settings[parameter.key] = undefined
      }
    })
    return settings
  }

  updateAttributeParameters(attributes, nodes, matrix, edges) {
    Object.values(this.attributeParameters).forEach(group => {
      group.update(this.settings, attributes, nodes, matrix, edges)
    })
  }

  updateSettings(settings) {
    Object.values(this.parameters).forEach(parameter => {
      settings = parameter.dealiasSettings(settings)
    })
    this.settings = settings
    this.widgets.forEach(widget => widget.update(settings))
  }

  get widgets() {
    return Object.values(this.parameters).map(
      parameter => parameter.widget
    ).filter(
      widget => widget !== undefined
    )
  }
}

export class Parameter {
  constructor(key, settings, definition) {
    this.key = key

    const widgetClass = definition.widgetClass
    Object.assign(this, definition)

    this.aliases = new Set(this.aliases || [])
      
    if (this.default === undefined) {
      if (this.options !== undefined && this.options.length) {
        this.default = this.options[0]
      }
    }

    if (widgetClass) {
      definition.settingName = this.key
      this.widget = new widgetClass(settings, definition)
    }
  }

  dealiasSettings(settings) {
    let sawAlias = false
    Object.keys(settings).forEach(key => {
      if (this.aliases.has(key)) {
        settings[this.key] = settings[key]
        sawAlias = true
        delete settings[key]
      }
    })

    if (sawAlias === false && settings[this.key] === undefined) {
      settings[this.key] = this.default
      this.defaultedSetting = true
    }

    return settings
  }
}

export class AttributeParameterGroup {
  static get parameterDefaults() {
    return {
      "Enabled": {
        "default": true,
        "visible": true,
        "widgetClass": widgets.CheckboxWidget,
      },
      "Attribute": {
        "default":"none",
        "visible": true,
        // "displayWith": "Enabled",
        "widgetClass": widgets.SelectWidget,
      },
      "Palette": {
        "default": null,
        "visible": true,
        "text": " with color palette ",
        "displayWith": "Attribute",
        "widgetClass": widgets.SelectWidget,
      },
      "Flip": {
        "default": false,
        "visible": true,
        "text": " flip ",
        "displayWith": "Attribute",
        "widgetClass": widgets.CheckboxWidget,
      },
      "Range": {
        "default": [0, 1],
        "visible": false,
        "displayWith": "Attribute",
        "widgetClass": widgets.TextWidget,
      },
    }
  }

  static isType(settingValues) {
    return Object.keys(settingValues).map(
      key => this.parameterDefaults[key]
    ).filter(
      value => value !== undefined
    ).length > 0
  }

  constructor(key, settings, rawParameters) {
    this.key = key
    this.object = rawParameters.object
    this.type = rawParameters.type

    if (rawParameters.Range === undefined) {
      rawParameters.Range = true
    }

    this.parameters = this.constructor.makeParameters(this.key, rawParameters, settings)
  }

  static makeParameters(key, rawParameters, settings) {
    let parameters = {}
    Object.entries(this.parameterDefaults).forEach(([name, defaults]) => {
      const overrides = rawParameters[name]

      if (overrides !== undefined) {
        let definition = JSON.parse(JSON.stringify(defaults))

        if (overrides !== true) {
          definition = Object.assign(definition, overrides)
        }

        definition.setHandler = 'redraw'
        definition.side = rawParameters.side
        definition.widgetClass = defaults.widgetClass

        if (definition.displayWith) {
          definition.displayWith = key + definition.displayWith
        }
        else if (definition.shareDisplay) {
          definition.displayWith = definition.shareDisplay
        }

        parameters[name] = new Parameter(key + name, settings, definition)
      }
    })

    return parameters
  }

  update(settings, attributes, nodes, matrix, edges) {
    // what we do:
    // - set the call handlers on all the attribers
    // - set the options on the lists
    //   - Attribute:
    //      - filter to scalar/color
    //      - set value
    //      - if None...
    //   - Palette
    //      - use attribute
    //   - Range
    //   - Flip
    //   - Enabled

    const attributeOptions = this.getAttributeOptions(attributes)
    const [key, attributeClass, valuesGetter] = this.getActiveAttribute(attributeOptions, settings)
    this.values = valuesGetter(nodes, matrix, edges)
    this.attribute = new attributeClass(key, this.values)

    let showWidget = this.widgetsEnabled(settings)

    const attributeParameter = this.parameters.Attribute
    attributeParameter.widget.options = Object.keys(attributeOptions)
    attributeParameter.widget.visible = attributeParameter.visible && showWidget
    attributeParameter.widget.update(settings)

    showWidget = showWidget && key !== 'none'

    const paletteParameter = this.parameters.Palette
    if (paletteParameter !== undefined) {
      this.attribute.colorPalette = settings[paletteParameter.key]

      paletteParameter.widget.options = this.attribute.colorPalettes
      paletteParameter.widget.visible = paletteParameter.visible && showWidget
      paletteParameter.widget.update(settings)
    }

    const rangeParameter = this.parameters.Range
    // console.log('when we unwind a viz, we need to null all the defaulted settings')
    // console.log(this.key)
    if (rangeParameter !== undefined) {
      this.attribute.setRange(settings[rangeParameter.key])
      // console.log('has range parameter')
      // console.log(settings[rangeParameter.key])

      rangeParameter.widget.visible = rangeParameter.visible && showWidget
      rangeParameter.widget.update(settings)
    }

    const flipParameter = this.parameters.Flip
    if (flipParameter !== undefined) {
      this.attribute.setFlip(settings[flipParameter.key])

      flipParameter.widget.visible = flipParameter.visible && showWidget
      flipParameter.widget.update(settings)
    }
  }

  getAttributeOptions(attributes) {
    const options = {}
    Object.entries(attributes[this.object] || {}).forEach(
      ([key, attribute]) => {
        if (attribute.class.displays.has(this.type)) {
          options[key] = attribute
        }
      }
    )
    return options
  }

  widgetsEnabled(settings) {
    const enabler = this.parameters.Enabled

    if (enabler === undefined) {
      return true
    }
    else if (settings[enabler.key]) {
      return true
    }

    return false
  }

  getActiveAttribute(options, settings) {
    const setting = settings[this.parameters.Attribute.key]

    if (setting === 'none' || ! this.widgetsEnabled(settings)) {
      return ['none', NoneAttribute, () => []]
    }

    const keys = Object.keys(options)
    
    let activeKey = keys.length ? keys.length[0] : 'none'
    if (options[setting] !== undefined) {
      activeKey = setting
    }

    return [activeKey, options[activeKey].class, options[activeKey].getValues]
  }
}