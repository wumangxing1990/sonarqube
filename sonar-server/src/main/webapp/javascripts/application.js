function showMessage(div_id, message) {
  $(div_id + 'msg').innerHTML = message;
  $(div_id).show();
}
function error(message) {
  showMessage('error', message);
}
function warning(message) {
  showMessage('warning', message);
}
function info(message) {
  showMessage('info', message);
}

function autocompleteResources() {
  $('searchInput').value = '';
  new Ajax.Autocompleter('searchInput', 'searchResourcesResults', baseUrl + '/search', {
    method:'post',
    minChars:3,
    indicator:'searchingResources',
    paramName:'s',
    updateElement:function (item) {
      if (item.id) {
        window.location = baseUrl + '/dashboard/index/' + item.id;
      }
    },
    onShow:function (element, update) { /* no update */
      update.show();
    }
  });
}

var SelectBox = {
  cache:new Object(),
  init:function (id) {
    var box = document.getElementById(id);
    var node;
    SelectBox.cache[id] = new Array();
    var cache = SelectBox.cache[id];
    for (var i = 0; (node = box.options[i]); i++) {
      cache.push({value:node.value, text:node.text, displayed:1});
    }
  },
  redisplay:function (id) {
    // Repopulate HTML select box from cache
    var box = document.getElementById(id);
    box.options.length = 0; // clear all options
    for (var i = 0, j = SelectBox.cache[id].length; i < j; i++) {
      var node = SelectBox.cache[id][i];
      if (node.displayed) {
        box.options[box.options.length] = new Option(node.text, node.value, false, false);
      }
    }
  },
  filter:function (id, text) {
    // Redisplay the HTML select box, displaying only the choices containing ALL
    // the words in text. (It's an AND search.)
    var tokens = text.toLowerCase().split(/\s+/);
    var node, token;
    for (var i = 0; (node = SelectBox.cache[id][i]); i++) {
      node.displayed = 1;
      for (var j = 0; (token = tokens[j]); j++) {
        if (node.text.toLowerCase().indexOf(token) == -1) {
          node.displayed = 0;
        }
      }
    }
    SelectBox.redisplay(id);
  },
  delete_from_cache:function (id, value) {
    var node, delete_index = null;
    for (var i = 0; (node = SelectBox.cache[id][i]); i++) {
      if (node.value == value) {
        delete_index = i;
        break;
      }
    }
    var j = SelectBox.cache[id].length - 1;
    for (var i = delete_index; i < j; i++) {
      SelectBox.cache[id][i] = SelectBox.cache[id][i + 1];
    }
    SelectBox.cache[id].length--;
  },
  add_to_cache:function (id, option) {
    SelectBox.cache[id].push({value:option.value, text:option.text, displayed:1});
  },
  cache_contains:function (id, value) {
    // Check if an item is contained in the cache
    var node;
    for (var i = 0; (node = SelectBox.cache[id][i]); i++) {
      if (node.value == value) {
        return true;
      }
    }
    return false;
  },
  move:function (from, to) {
    var from_box = document.getElementById(from);
    var option;
    for (var i = 0; (option = from_box.options[i]); i++) {
      if (option.selected && SelectBox.cache_contains(from, option.value)) {
        SelectBox.add_to_cache(to, {value:option.value, text:option.text, displayed:1});
        SelectBox.delete_from_cache(from, option.value);
      }
    }
    SelectBox.redisplay(from);
    SelectBox.redisplay(to);
  },
  move_all:function (from, to) {
    var from_box = document.getElementById(from);
    var option;
    for (var i = 0; (option = from_box.options[i]); i++) {
      if (SelectBox.cache_contains(from, option.value)) {
        SelectBox.add_to_cache(to, {value:option.value, text:option.text, displayed:1});
        SelectBox.delete_from_cache(from, option.value);
      }
    }
    SelectBox.redisplay(from);
    SelectBox.redisplay(to);
  },
  sort:function (id) {
    SelectBox.cache[id].sort(function (a, b) {
      a = a.text.toLowerCase();
      b = b.text.toLowerCase();
      try {
        if (a > b) return 1;
        if (a < b) return -1;
      }
      catch (e) {
        // silently fail on IE 'unknown' exception
      }
      return 0;
    });
  },
  select_all:function (id) {
    var box = document.getElementById(id);
    for (var i = 0; i < box.options.length; i++) {
      box.options[i].selected = 'selected';
    }
  }
};

var treemapContexts = {};

function addTmEvent(treemap_id, elt_index) {
  var elt = $('tm-node-' + treemap_id + '-' + elt_index);
  elt.oncontextmenu = function () {
    return false
  };
  elt.observe('mouseup', function (event) {
    context = treemapContexts[treemap_id];
    onTmClick(treemap_id, event, context);
  });
}

function onTmClick(treemap_id, event, context) {
  if (Event.isLeftClick(event)) {
    var link = event.findElement('a');
    if (link != null) {
      event.stopPropagation();
      return false;
    }

    var elt = event.findElement('div');
    var rid = elt.readAttribute('rid');
    var browsable = elt.hasAttribute('b');
    if (browsable) {
      var label = elt.innerText || elt.textContent;
      context.push([rid, label]);
      refreshTm(treemap_id, rid);
    } else {
      openResource(rid);
    }

  } else if (Event.isRightClick(event)) {
    if (context.length > 1) {
      context.pop();
      var rid = context[context.length - 1][0];
      refreshTm(treemap_id, rid);
    }
  }
}

function refreshTm(treemap_id, resource_id) {
  var size = $F('tm-size-' + treemap_id);
  var color = $F('tm-color-' + treemap_id);
  var width = $('tm-' + treemap_id).getWidth() - 10;
  var height = Math.round(width * parseFloat($F('tm-h-' + treemap_id) / 100.0));
  var rid = (resource_id!=null ? resource_id : context[context.length-1][0]);

  context = treemapContexts[treemap_id];
  var output = '';
  context.each(function (elt) {
    output += elt[1] + '&nbsp;/&nbsp;';
  });
  $('tm-bc-' + treemap_id).innerHTML = output;
  $('tm-loading-' + treemap_id).show();

  new Ajax.Request(
    baseUrl + '/treemap/index?id=' + treemap_id + '&width=' + width + '&height=' + height + '&size_metric=' + size + '&color_metric=' + color + '&resource=' + rid,
    {asynchronous:true, evalScripts:true});

  return false;
}

function openResource(key) {
  document.location = baseUrl + '/dashboard/index/' + key;
  return false;
}