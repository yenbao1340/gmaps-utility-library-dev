/*
* LabeledMarker Class
*
* Copyright 2007 Mike Purvis (http://uwmike.com)
* 
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
* 
*       http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*
* This class extends the Maps API's standard GMarker class with the ability
* to support markers with textual labels. Please see articles here:
*
*       http://googlemapsbook.com/2007/01/22/extending-gmarker/
*       http://googlemapsbook.com/2007/03/06/clickable-labeledmarker/
*/

/* Constructor */
function LabeledMarker(latlng, options){
  this.latlng_ = latlng;
  this.labelText_ = options.labelText || "";
  this.labelClass_ = options.labelClass || "markerLabel";
  this.labelOffset_ = options.labelOffset || new GSize(0, 0);
  
  this.clickable_ = options.clickable || true;
  
  if (options.draggable) {
  	// This version of LabeledMarker doesn't support dragging.
  	options.draggable = false;
  }
  
  GMarker.apply(this, arguments);
}


// It's a limitation of JavaScript inheritance that we can't conveniently
// extend GMarker without having to run its constructor. In order for the
// constructor to run, it requires some dummy GLatLng.
LabeledMarker.prototype = new GMarker(new GLatLng(0, 0));


// Creates the text div that goes over the marker.
LabeledMarker.prototype.initialize = function(map) {
  // Do the GMarker constructor first.
  GMarker.prototype.initialize.apply(this, arguments);
  
  this.map_ = map;
  this.div_ = document.createElement("div");
  this.div_.className = this.labelClass_;
  this.div_.innerHTML = this.labelText_;
  this.div_.style.position = "absolute";
  this.div_.style.cursor = "pointer";
  map.getPane(G_MAP_MARKER_PANE).appendChild(this.div_);

  if (this.clickable_) {
    // Creates a closure for passing events through to the source marker
    // This is located in here to avoid cluttering the global namespace.
    // The downside is that the local variables from initialize() continue
    // to occupy space on the stack.
    function newEventPassthru(obj, event) {
      return function() { 
        GEvent.trigger(obj, event);
      };
    }
  
    // Pass through events fired on the text div to the marker.
    var eventPassthrus = ['click', 'dblclick', 'mousedown', 'mouseup', 'mouseover', 'mouseout'];
    for(var i = 0; i < eventPassthrus.length; i++) {
      var name = eventPassthrus[i];
      GEvent.addDomListener(this.div_, name, newEventPassthru(this, name));
    }
  }
}

// Redraw the rectangle based on the current projection and zoom level
LabeledMarker.prototype.redraw = function(force) {
  GMarker.prototype.redraw.apply(this, arguments);
  
  // We only need to do anything if the coordinate system has changed
  if (!force) return;
  
  // Calculate the DIV coordinates of two opposite corners of our bounds to
  // get the size and position of our rectangle
  var p = this.map_.fromLatLngToDivPixel(this.latlng_);
  var z = GOverlay.getZIndex(this.latlng_.lat());
  
  // Now position our div based on the div coordinates of our bounds
  this.div_.style.left = (p.x + this.labelOffset_.width) + "px";
  this.div_.style.top = (p.y + this.labelOffset_.height) + "px";
  this.div_.style.zIndex = z; // in front of the marker
}

// Remove the main DIV from the map pane, destroy event handlers
LabeledMarker.prototype.remove = function() {
  GEvent.clearInstanceListeners(this.div_);
  this.div_.parentNode.removeChild(this.div_);
  this.div_ = null;
  GMarker.prototype.remove.apply(this, arguments);
}

