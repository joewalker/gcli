/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var host = require('gcli/host');
var l10n = require('gcli/l10n');
var types = require('gcli/types');
var SelectionType = require('gcli/types/basic').SelectionType;
var Status = require('gcli/types').Status;
var Conversion = require('gcli/types').Conversion;


/**
 * Registration and de-registration.
 */
exports.startup = function() {
  types.registerType(ResourceType);
};

exports.shutdown = function() {
  types.unregisterType(ResourceType);
  exports.clearResourceCache();
};

exports.clearResourceCache = function() {
  ResourceCache.clear();
};

/**
 * The object against which we complete, which is usually 'window' if it exists
 * but could be something else in non-web-content environments.
 */
var doc;
if (typeof document !== 'undefined') {
  doc = document;
}

/**
 * Setter for the document that contains the nodes we're matching
 */
exports.setDocument = function(document) {
  doc = document;
};

/**
 * Undo the effects of setDocument()
 */
exports.unsetDocument = function() {
  doc = undefined;
};

/**
 * Getter for the document that contains the nodes we're matching
 * Most for changing things back to how they were for unit testing
 */
exports.getDocument = function() {
  return doc;
};

/**
 * Resources are bits of CSS and JavaScript that the page either includes
 * directly or as a result of reading some remote resource.
 * Resource should not be used directly, but instead through a sub-class like
 * CssResource or ScriptResource.
 */
function Resource(id, name, type, inline, element) {
  this.id = id;
  this.name = name;
  this.type = type;
  this.inline = inline;
  this.element = element;
}

/**
 * Get the contents of the given resource as a string.
 * The base Resource leaves this unimplemented.
 */
Resource.prototype.getContents = function() {
  throw new Error('not implemented');
};

Resource.TYPE_SCRIPT = 'text/javascript';
Resource.TYPE_CSS = 'text/css';

/**
 * A CssResource provides an implementation of Resource that works for both
 * [style] elements and [link type='text/css'] elements in the [head].
 */
function CssResource(domSheet) {
  this.name = domSheet.href;
  if (!this.name) {
    this.name = domSheet.ownerNode.id ?
            'css#' + domSheet.ownerNode.id :
            'inline-css';
  }

  this.inline = (domSheet.href == null);
  this.type = Resource.TYPE_CSS;
  this.element = domSheet;
}

CssResource.prototype = Object.create(Resource.prototype);

CssResource.prototype.loadContents = function(callback) {
  callback(this.element.ownerNode.innerHTML);
};

CssResource._getAllStyles = function() {
  var resources = [];
  Array.prototype.forEach.call(doc.styleSheets, function(domSheet) {
    CssResource._getStyle(domSheet, resources);
  });

  dedupe(resources, function(clones) {
    for (var i = 0; i < clones.length; i++) {
      clones[i].name = clones[i].name + '-' + i;
    }
  });

  return resources;
};

CssResource._getStyle = function(domSheet, resources) {
  var resource = ResourceCache.get(domSheet);
  if (!resource) {
    resource = new CssResource(domSheet);
    ResourceCache.add(domSheet, resource);
  }
  resources.push(resource);

  // Look for imported stylesheets
  try {
    Array.prototype.forEach.call(domSheet.cssRules, function(domRule) {
      if (domRule.type == CSSRule.IMPORT_RULE && domRule.styleSheet) {
        CssResource._getStyle(domRule.styleSheet, resources);
      }
    }, this);
  }
  catch (ex) {
    // For system stylesheets
  }
};

/**
 * A ScriptResource provides an implementation of Resource that works for
 * [script] elements (both with a src attribute, and used directly).
 */
function ScriptResource(scriptNode) {
  this.name = scriptNode.src;
  if (!this.name) {
    this.name = scriptNode.id ?
            'script#' + scriptNode.id :
            'inline-script';
  }

  this.inline = (scriptNode.src === '' || scriptNode.src == null);
  this.type = Resource.TYPE_SCRIPT;
  this.element = scriptNode;
}

ScriptResource.prototype = Object.create(Resource.prototype);

ScriptResource.prototype.loadContents = function(callback) {
  if (this.inline) {
    callback(this.element.innerHTML);
  }
  else {
    // It would be good if there was a better way to get the script source
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (xhr.readyState !== xhr.DONE) {
        return;
      }
      callback(xhr.responseText);
    };
    xhr.open('GET', this.element.src, true);
    xhr.send();
  }
};

ScriptResource._getAllScripts = function() {
  var scriptNodes = doc.querySelectorAll('script');
  var resources = Array.prototype.map.call(scriptNodes, function(scriptNode) {
    var resource = ResourceCache.get(scriptNode);
    if (!resource) {
      resource = new ScriptResource(scriptNode);
      ResourceCache.add(scriptNode, resource);
    }
    return resource;
  });

  dedupe(resources, function(clones) {
    for (var i = 0; i < clones.length; i++) {
      clones[i].name = clones[i].name + '-' + i;
    }
  });

  return resources;
};

/**
 * Find resources with the same name, and call onDupe to change the names
 */
function dedupe(resources, onDupe) {
  // first create a map of name->[array of resources with same name]
  var names = {};
  resources.forEach(function(scriptResource) {
    if (names[scriptResource.name] == null) {
      names[scriptResource.name] = [];
    }
    names[scriptResource.name].push(scriptResource);
  });

  // Call the de-dupe function for each set of dupes
  Object.keys(names).forEach(function(name) {
    var clones = names[name];
    if (clones.length > 1) {
      onDupe(clones);
    }
  });
}

/**
 * A CSS expression that refers to a single node
 */
function ResourceType(typeSpec) {
  this.include = typeSpec.include;
  if (this.include !== Resource.TYPE_SCRIPT &&
      this.include !== Resource.TYPE_CSS &&
      this.include != null) {
    throw new Error('invalid include property: ' + this.include);
  }
}

ResourceType.prototype = Object.create(SelectionType.prototype);

/**
 * There are several ways to get selection data. This unifies them into one
 * single function.
 * @return A map of names to values.
 */
ResourceType.prototype.getLookup = function() {
  var resources = [];
  if (this.include !== Resource.TYPE_SCRIPT) {
    Array.prototype.push.apply(resources, CssResource._getAllStyles());
  }
  if (this.include !== Resource.TYPE_CSS) {
    Array.prototype.push.apply(resources, ScriptResource._getAllScripts());
  }

  return resources.map(function(resource) {
    return { name: resource.name, value: resource };
  });
};

ResourceType.prototype.name = 'resource';


/**
 * A quick cache of resources against nodes
 * TODO: Potential memory leak when the target document has css or script
 * resources repeatedly added and removed. Solution might be to use a weak
 * hash map or some such.
 */
var ResourceCache = {
  _cached: [],

  /**
   * Do we already have a resource that was created for the given node
   */
  get: function(node) {
    for (var i = 0; i < ResourceCache._cached.length; i++) {
      if (ResourceCache._cached[i].node === node) {
        return ResourceCache._cached[i].resource;
      }
    }
    return null;
  },

  /**
   * Add a resource for a given node
   */
  add: function(node, resource) {
    ResourceCache._cached.push({ node: node, resource: resource });
  },

  /**
   * Drop all cache entries. Helpful to prevent memory leaks
   */
  clear: function() {
    ResourceCache._cached = {};
  }
};


});
