
/**
 * Element.classList
 */
if (typeof document !== 'undefined' && !('classList' in document.createElement('a'))) {

  (function (view) {

    // Vendors: please allow content code to instantiate DOMExceptions
    var DOMEx = function(type, message) {
      this.name = type;
      this.code = DOMException[type];
      this.message = message;
    };

    // Most DOMException implementations don't allow calling DOMException's
    // toString()
    // on non-DOMExceptions. Error's toString() is sufficient here.
    DOMEx.prototype = Error.prototype;

    function checkTokenAndGetIndex(classList, token) {
      if (token === '') {
        throw new DOMEx('SYNTAX_ERR', 'An invalid or illegal string was specified');
      }
      if (/\s/.test(token)) {
        throw new DOMEx('INVALID_CHARACTER_ERR', 'String contains an invalid character');
      }
      return classList.indexOf(token);
    }

    function ClassList(elem) {
      var trimmedClasses = elem.className.trim();
      var classes = trimmedClasses ? trimmedClasses.split(/\s+/) : [];
      for (var i = 0; i < classes.length; i++) {
         this.push(classes[i]);
      }
      this._updateClassName = function() {
        elem.className = this.toString();
      };
    }

    ClassList.prototype = [];

    ClassList.prototype.item = function(i) {
      return this[i] || null;
    };

    ClassList.prototype.contains = function(token) {
      token += '';
      return checkTokenAndGetIndex(this, token) !== -1;
    };

    ClassList.prototype.add = function(token) {
      token += '';
      if (checkTokenAndGetIndex(this, token) === -1) {
        this.push(token);
        this._updateClassName();
      }
    };

    ClassList.prototype.remove = function(token) {
      token += '';
      var index = checkTokenAndGetIndex(this, token);
      if (index !== -1) {
        this.splice(index, 1);
        this._updateClassName();
      }
    };

    ClassList.prototype.toggle = function(token) {
      token += '';
      if (checkTokenAndGetIndex(this, token) === -1) {
        this.add(token);
      } else {
        this.remove(token);
      }
    };

    ClassList.prototype.toString = function() {
      return this.join(' ');
    };

    if (Object.defineProperty) {
      var elemCtrProto = view.HTMLElement || view.Element;
      Object.defineProperty(elemCtrProto.prototype, 'classList', {
        get: function() {
          return new ClassList(this);
        },
        enumerable: true,
        configurable: true
      });
    }

  }(self));
}

