/*
* ExtInfoWindow Class 
*  Copyright (c) 2007, Joe Monahan (http://www.seejoecode.com)
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
* This class lets you add an info window to the map which mimics GInfoWindow
* and allows for users to skin it via CSS.  Additionally it has options to
* pull in HTML content from an ajax request, triggered when a user clicks on
* the associated marker.
*/


/**
 * Creates a new ExtInfoWindow that will initialize by reading styles from css
 *
 * @constructor
 * @param {GMarker} marker The marker associated with the info window
 * @param {String} windowId The DOM Id we will use to reference the info window
 * @param {String} html The HTML contents
 * @param {Object} opt_opts A contianer for optional arguments:
 *    {String} ajaxUrl The Url to hit on the server to request some contents 
 *    {Number} paddingX The padding size in pixels that the info window will leave on 
 *                    the left and right sides of the map when panning is involved.
 *    {Number} paddingY The padding size in pixels that the info window will leave on 
 *                    the top and bottom sides of the map when panning is involved.
 *    {Number} beakOffset The repositioning offset for when aligning the beak element. 
 *                    This is used to make sure the beak lines up correcting if the 
 *                    info window styling containers a border.
 */
function ExtInfoWindow(marker, windowId, html, opt_opts) {
	this.html = html;
	this.marker = marker;
	this.infoWindowId = windowId;

	this.options = opt_opts == null ? {} : opt_opts;
	this.ajaxUrl = this.options.ajaxUrl == null ? null : this.options.ajaxUrl;
	this.borderSize = this.options.beakOffset == null ? 0 : this.options.beakOffset;
	this.paddingX = this.options.paddingX == null ? 0+this.borderSize : this.options.paddingX+this.borderSize;
	this.paddingY = this.options.paddingY == null ? 0+this.borderSize : this.options.paddingY+this.borderSize;
		
	this.wrapperParts = {
	  tl:{t:0, l:0, w:0, h:0, domElement: null},
	  t:{t:0, l:0, w:0, h:0, domElement: null},
	  tr:{t:0, l:0, w:0, h:0, domElement: null},
	  l:{t:0, l:0, w:0, h:0, domElement: null},
	  r:{t:0, l:0, w:0, h:0, domElement: null},
	  bl:{t:0, l:0, w:0, h:0, domElement: null},
	  b:{t:0, l:0, w:0, h:0, domElement: null},
	  br:{t:0, l:0, w:0, h:0, domElement: null},
	  beak:{t:0, l:0, w:0, h:0, domElement: null},
	  close:{t:0, l:0, w:0, h:0, domElement: null}
	};
	
	for( i in this.wrapperParts ){
		var tempElement = document.createElement("div");
		tempElement.id = this.infoWindowId+"_"+i;
		tempElement.style.visibility="hidden";
		document.body.appendChild(tempElement);
		tempElement = document.getElementById(this.infoWindowId+"_"+i);
		var tempWrapperPart = eval("this.wrapperParts."+i);    
		tempWrapperPart.w = parseInt(this.getStyle_(tempElement, "width"));
		tempWrapperPart.h = parseInt(this.getStyle_(tempElement, "height"));
		document.body.removeChild(tempElement);
	}
};

//use the GOverlay class
ExtInfoWindow.prototype = new GOverlay();

/**
 * Called by GMap2's addOverlay method.  Creates the wrapping div for our info window and adds
 * it to the relevant map pane.  Also binds mousedown event to a private function so that they
 * are not passed to the underlying map.  Finally, performs ajax request if set up to use ajax
 * in the constructor.
 * @param {GMap2} map The map that has had this extInfoWindow is added to it.
 */
ExtInfoWindow.prototype.initialize = function(map) {
	this.map = map;
	var container = document.createElement("div");
	container.style.position="relative";
	container.style.display="none";
	this.map.getPane(G_MAP_FLOAT_PANE).appendChild(container);
	this.container = container;
	this.container.id = this.infoWindowId;
	this.container.style.width = this.getStyle_(document.getElementById(this.infoWindowId), "width");
	
	this.contentDiv = document.createElement("div");
	this.contentDiv.id = this.infoWindowId+"_contents";
	this.contentDiv.innerHTML = this.html;
	this.contentDiv.style.display = 'block';
	this.contentDiv.style.visibility = 'hidden';

	this.map.getContainer().appendChild(this.contentDiv);	
	this.contentWidth = this.getDimensions_(this.container).width;
  this.contentDiv.style.width = this.contentWidth+'px';
	this.contentDiv.style.position = 'absolute';
	
	this.wrapperDiv = document.createElement("div");
	this.container.appendChild(this.wrapperDiv);

	GEvent.bindDom(this.container,"mousedown",this,this.onClick_);

	if( this.ajaxUrl != null ){
		this.ajaxRequest_(this.ajaxUrl);
	}
	
	GEvent.trigger(this.map, "extinfowindowopen");
};

/**
 * Private function to steal mouse click events to prevent it from returning to the map.
 * Without this links in the ExtInfoWindow would not work, and you could click to zoom or drag 
 * the map behind it.
 * @param {MouseEvent} e The mouse event caught by this function
 */
ExtInfoWindow.prototype.onClick_ = function(e){
  if(navigator.userAgent.toLowerCase().indexOf("msie")!=-1 && document.all){
		window.event.cancelBubble=true;
		window.event.returnValue=false;
	}
  else{
		e.preventDefault();
		e.stopPropagation()
	}
};

/**
 * Remove the extInfoWindow container from the map pane. 
 */
ExtInfoWindow.prototype.remove = function() {
	this.container.parentNode.removeChild(this.container);
	GEvent.trigger(this.map, "extinfowindowclose");
};

/**
 * Return a copy of this overlay, for the parent Map to duplicate itself in full. This
 * is part of the Overlay interface and is used, for example, to copy everything in the 
 * main view into the mini-map.
 * @return {GOverlay}
 */
ExtInfoWindow.prototype.copy = function() {
	return new ExtInfoWindow(this.marker, this.infoWindowId, this.html, this.options);
};

/**
 * Draw extInfoWindow and wrapping decorators onto the map.  Resize and reposition
 * the map as necessary. 
 * @param {Boolean} force Will be true when pixel coordinates need to be recomputed.
 */
ExtInfoWindow.prototype.redraw = function(force) {
	if (!force) return;
	
	var contentHeight = this.contentDiv.offsetHeight;
	this.contentDiv.style.height = contentHeight+"px";

  //reposition contents depending on wrapper parts.
  //this is necessary for content that is pulled in via ajax
	this.contentDiv.style.left=this.wrapperParts.l.w+'px';
	this.contentDiv.style.top=this.wrapperParts.tl.h+'px';
	
	this.contentDiv.style.visibility='visible';
	


	//Finish configuring wrapper parts that were not set in initialization
	this.wrapperParts.tl.t=0;
	this.wrapperParts.tl.l=0;
	this.wrapperParts.t.l =this.wrapperParts.tl.w;
	this.wrapperParts.t.w = (this.wrapperParts.l.w + this.contentWidth + this.wrapperParts.r.w)-this.wrapperParts.tl.w-this.wrapperParts.tr.w;
	this.wrapperParts.t.h = this.wrapperParts.tl.h;
	this.wrapperParts.tr.l = this.wrapperParts.t.w + this.wrapperParts.tl.w;
	this.wrapperParts.l.t = this.wrapperParts.tl.h;
	this.wrapperParts.l.h = contentHeight;
	this.wrapperParts.r.l = this.contentWidth+this.wrapperParts.l.w;
	this.wrapperParts.r.t = this.wrapperParts.tr.h;
	this.wrapperParts.r.h = contentHeight;
	this.wrapperParts.bl.t = contentHeight + this.wrapperParts.tl.h;
	this.wrapperParts.b.l = this.wrapperParts.bl.w;
	this.wrapperParts.b.t = contentHeight + this.wrapperParts.tl.h;
	this.wrapperParts.b.w = (this.wrapperParts.l.w + this.contentWidth + this.wrapperParts.r.w) - this.wrapperParts.bl.w - this.wrapperParts.br.w;
	this.wrapperParts.b.h = this.wrapperParts.bl.h;
	this.wrapperParts.br.l = this.wrapperParts.b.w + this.wrapperParts.bl.w;
	this.wrapperParts.br.t = contentHeight + this.wrapperParts.tr.h;
	this.wrapperParts.close.l = this.wrapperParts.tr.l +this.wrapperParts.tr.w - this.wrapperParts.close.w - this.borderSize;
	this.wrapperParts.close.t = this.borderSize;
	this.wrapperParts.beak.l = this.borderSize + (this.contentWidth/2) - (this.wrapperParts.beak.w/2);
	this.wrapperParts.beak.t = this.wrapperParts.bl.t + this.wrapperParts.bl.h - this.borderSize;

	//create the decoration wrapper DOM objects
	//append the styled info window to the container
	for (i in this.wrapperParts) {
  	if( i == "close" ){
			//first append the content so the close button is layered above
			this.wrapperDiv.appendChild(this.contentDiv);
		}
	  var wrapperPartsDiv = null;
	  if( this.wrapperParts[i].domElement == null){
      wrapperPartsDiv = document.createElement('div');
      this.wrapperDiv.appendChild(wrapperPartsDiv);
	  }else{
	    wrapperPartsDiv = this.wrapperParts[i].domElement;
    }
		wrapperPartsDiv.id = this.infoWindowId+"_"+i;
		wrapperPartsDiv.style.position='absolute';
		wrapperPartsDiv.style.width= this.wrapperParts[i].w+"px";
		wrapperPartsDiv.style.height= this.wrapperParts[i].h+"px";
		wrapperPartsDiv.style.top=this.wrapperParts[i].t+'px';
		wrapperPartsDiv.style.left=this.wrapperParts[i].l+'px';

		this.wrapperParts[i].domElement = wrapperPartsDiv;
	}

	//add event handlers like the close box
	var currentMarker = this.marker;
	var thisMap = this.map;
	GEvent.addDomListener(this.wrapperParts.close.domElement, "click", 
	  function() {
		  thisMap.closeExtInfoWindow();
	  }
	);

	//get the X,Y pixel location of the marker
	var pixelLocation = this.map.fromLatLngToDivPixel(this.marker.getPoint());

	//position the container div for the window
	this.container.style.position='absolute';
	var markerIcon = this.marker.getIcon();

	this.container.style.left = (pixelLocation.x 
		- (this.contentWidth/2) 
		- markerIcon.iconAnchor.x 
		+ markerIcon.infoWindowAnchor.x
		) + "px";
		
	this.container.style.top = (pixelLocation.y
	  - this.wrapperParts.bl.h
		- contentHeight
		- this.wrapperParts.tl.h
		- this.wrapperParts.beak.h
		- markerIcon.iconAnchor.y
		+ markerIcon.infoWindowAnchor.y
		+ this.borderSize
	) + "px";
	
	this.container.style.display = 'block';

	if(this.map.ExtInfoWindowInstance != null) {
		//this.resize();
		this.repositionMap();
	}
};

/**
 * Determine the dimensions of the contents to recalculate and reposition the 
 * wrapping decorator elements accordingly.
 */
ExtInfoWindow.prototype.resize = function(){
  
	this.contentDiv.style.height = "auto";
	var contentHeight = this.contentDiv.offsetHeight;
	this.contentDiv.style.height = contentHeight + "px";
	
	var contentWidth = this.contentDiv.offsetWidth;
	var pixelLocation = this.map.fromLatLngToDivPixel(this.marker.getPoint());

	var oldWindowHeight = this.wrapperParts.t.domElement.offsetHeight + this.wrapperParts.l.domElement.offsetHeight + this.wrapperParts.b.domElement.offsetHeight;
	var oldWindowPosTop = this.wrapperParts.t.domElement.offsetTop;
	
	this.wrapperParts.l.domElement.style.height = contentHeight + "px";
	this.wrapperParts.r.domElement.style.height = contentHeight + "px";

	//shrink down info window to look correct for new height
	var newPosTop = this.wrapperParts.b.domElement.offsetTop - contentHeight;
	this.wrapperParts.l.domElement.style.top = newPosTop + "px";
	this.wrapperParts.r.domElement.style.top = newPosTop + "px";
	this.contentDiv.style.top = newPosTop + "px";

	windowTHeight = parseInt(this.wrapperParts.t.domElement.style.height);
	newPosTop -= windowTHeight;
	this.wrapperParts.close.domElement.style.top = newPosTop + this.borderSize + "px";
	this.wrapperParts.tl.domElement.style.top = newPosTop + "px";
	this.wrapperParts.t.domElement.style.top = newPosTop + "px";
	this.wrapperParts.tr.domElement.style.top = newPosTop + "px";

	var newWindowHeight = this.wrapperParts.t.domElement.offsetHeight + this.wrapperParts.l.domElement.offsetHeight + this.wrapperParts.b.domElement.offsetHeight;
	var newWindowPosTop = this.wrapperParts.t.domElement.offsetTop;
	
	this.repositionMap();
};

/**
 * Check to see if the displayed extInfoWindow is positioned off the viewable 
 * map region and by how much.  Use that information to pan the map so that 
 * the extInfoWindow is completely displayed.
 */
ExtInfoWindow.prototype.repositionMap = function(){
	//pan if necessary so it shows on the screen
	var mapNE = this.map.fromLatLngToDivPixel(
		this.map.getBounds().getNorthEast()
	);
	var mapSW = this.map.fromLatLngToDivPixel(
		this.map.getBounds().getSouthWest()
	);
	var markerPosition = this.map.fromLatLngToDivPixel(
		this.marker.getPoint()
	);

	var panX=0;
	var panY=0;
	var paddingX = this.paddingX;
	var paddingY = this.paddingY;
	var infoWindowAnchor = this.marker.getIcon().infoWindowAnchor;

	//test top of screen	
	var windowT = this.wrapperParts.t.domElement;
	var windowL = this.wrapperParts.l.domElement;
	var windowB = this.wrapperParts.b.domElement;
	var windowR = this.wrapperParts.r.domElement;
	var windowBeak = this.wrapperParts.beak.domElement;

	var offsetTop = markerPosition.y - ( this.marker.getIcon().iconSize.height +  this.getDimensions_(windowBeak).height + this.getDimensions_(windowB).height + this.getDimensions_(windowL).height + this.getDimensions_(windowT).height + this.paddingY);
	if( offsetTop < mapNE.y) {
		panY = mapNE.y - offsetTop;
	}else{
		//test bottom of screen
		var offsetBottom = markerPosition.y + this.paddingY;
		if(offsetBottom >= mapSW.y) {
			panY = -(offsetBottom - mapSW.y);
		}
	}

	//test right of screen
	var offsetRight = Math.round(markerPosition.x + this.marker.getIcon().iconSize.width/2 + this.getDimensions_(this.container).width/2 + this.getDimensions_(windowR).width + this.borderSize + this.paddingX + infoWindowAnchor.x );
	if(offsetRight > mapNE.x) {
		panX = -( offsetRight - mapNE.x);
	}else{
		//test left of screen
		var offsetLeft = - (Math.round( (this.getDimensions_(this.container).width/2 - this.marker.getIcon().iconSize.width/2) + this.getDimensions_(windowL).width + this.borderSize + this.paddingX) - markerPosition.x - infoWindowAnchor.x);
		if( offsetLeft < mapSW.x) {
			panX = mapSW.x - offsetLeft;
		}
	}

	if(panX!=0 || panY!=0 && this.map.ExtInfoWindowInstance != null ) {
		this.map.panBy(new GSize(panX,panY));
	}
};

/**
 * Private function that handles performing an ajax request to the server.  The response
 * information is assumed to be HTML and is placed inside this extInfoWindow's contents region.
 * Last, check to see if the height has changed, and resize the extInfoWindow accordingly.
 * @param {String} url The Url of where to make the ajax request on the server
 */
ExtInfoWindow.prototype.ajaxRequest_ = function(url){
	var request = GXmlHttp.create();
	request.open("GET", url, true);
	var thismap = this.map;
	var thisContentDiv = this.contentDiv;
	request.onreadystatechange = function(){
		if (request.readyState == 4) {
			result = request.responseText;
			var infoWindow = document.getElementById(thismap.ExtInfoWindowInstance.infoWindowId+"_contents");
			try{
				infoWindow.innerHTML = result;
				thismap.ExtInfoWindowInstance.resize();
      	GEvent.trigger(thismap, "extinfowindowupdate");
			}catch(err){
				//An error will occur here if the ExtInfoWindow is closed after the ajax call was kicked off
				//and before the contents could be updated.  For now just throw it away.
			}
		}
	}
	request.send(null);
};

/**
 * Private function derived from Prototype.js to get a given element's
 * height and width
 * @param {Object} element The DOM element that will have height and 
 *                    width will be calculated for it.
 * @return {Object} Object with keys: width, height
 */
ExtInfoWindow.prototype.getDimensions_ = function(element) {
    var display = this.getStyle_(element, 'display');
    if (display != 'none' && display != null) // Safari bug
      return {width: element.offsetWidth, height: element.offsetHeight};

    // All *Width and *Height properties give 0 on elements with display none,
    // so enable the element temporarily
    var els = element.style;
    var originalVisibility = els.visibility;
    var originalPosition = els.position;
    var originalDisplay = els.display;
    els.visibility = 'hidden';
    els.position = 'absolute';
    els.display = 'block';
    var originalWidth = element.clientWidth;
    var originalHeight = element.clientHeight;
    els.display = originalDisplay;
    els.position = originalPosition;
    els.visibility = originalVisibility;
    return {width: originalWidth, height: originalHeight};
};

/**
 * Private function derived from Prototype.js to get a given element's
 * value that is associated with the passed style
 * @param {Object} element The DOM element that will be checked.
 * @param {String} style The style name that will be have it's value returned.
 * @return {Object}
 */
ExtInfoWindow.prototype.getStyle_ = function(element, style) {	
  var found = false;
  style = this.camelize_(style);
  var value = element.style[style];
  if (!value) {
    if (document.defaultView && document.defaultView.getComputedStyle) {
      var css = document.defaultView.getComputedStyle(element, null);
      value = css ? css[style] : null;
    } else if (element.currentStyle) {
      value = element.currentStyle[style];
    }
  }
  if((value == 'auto') && (style == 'width' || style == 'height') && (this.getStyle_(element, 'display') != 'none')){
    if( style == "width" ){
      value = element.offsetWidth;
    }else{
      value = element.offsetHeight;
    }
  }
  if (window.opera && ['left', 'top', 'right', 'bottom'].include(style)){
    if (this.getStyle_(element, 'position') == 'static') value = 'auto';
  } 
  return (value == 'auto') ? null : value;
};

/**
 * Private function pulled from Prototype.js that will change a hyphened
 * style name into camel case.
 * @param {String} element The string that will be parsed and made into camel case
 * @return {String}
 */
ExtInfoWindow.prototype.camelize_ = function(element) {
    var parts = element.split('-'), len = parts.length;
    if (len == 1) return parts[0];
    var camelized = element.charAt(0) == '-'
      ? parts[0].charAt(0).toUpperCase() + parts[0].substring(1)
      : parts[0];

    for (var i = 1; i < len; i++){
      camelized += parts[i].charAt(0).toUpperCase() + parts[i].substring(1);
    }
    return camelized;
};

GMap.prototype.ExtInfoWindowInstance = null;
GMap.prototype.ZoomEndListener = null;
GMap.prototype.ClickListener = null;
GMap.prototype.InfoWindowListener = null;

/**
 * Creates a new instance of ExtInfoWindow for the GMarker.  Register the newly created 
 * instance with the map, ensuring only one window is open at a time. If this is the first
 * ExtInfoWindow ever opened, add event listeners to the map to close the ExtInfoWindow on 
 * zoom and click, to mimic the default GInfoWindow behavior.
 *
 * @param {GMap} map The GMap2 object where the ExtInfoWindow will open
 * @param {String} cssId The id we will use to reference the info window
 * @param {String} html The HTML contents
 * @param {Object} opt_opts A contianer for optional arguments:
 *    {String} ajaxUrl The Url to hit on the server to request some contents 
 *    {Number} paddingX The padding size in pixels that the info window will leave on 
 *                    the left and right sides of the map when panning is involved.
 *    {Number} paddingX The padding size in pixels that the info window will leave on 
 *                    the top and bottom sides of the map when panning is involved.
 *    {Number} beakOffset The repositioning offset for when aligning the beak element. 
 *                    This is used to make sure the beak lines up correcting if the 
 *                    info window styling containers a border.
 */
GMarker.prototype.openExtInfoWindow = function(map, cssId, html, opt_opts) {
	map.closeInfoWindow();
	if(map.ExtInfoWindowInstance != null) {
	  map.closeExtInfoWindow();
	}
	if(map.ExtInfoWindowInstance == null) {
		map.ExtInfoWindowInstance = new ExtInfoWindow(
					this,
					cssId,
					html,
					opt_opts
		);

		if( map.ClickListener == null){
		  //listen for map click, close ExtInfoWindow if open
			map.ClickListener = GEvent.addListener(map, "click",
				function(event){
					if( !event && map.ExtInfoWindowInstance != null ){
						map.closeExtInfoWindow();
					}
				}
			);
		}
		if( map.InfoWindowListener == null){
		  //listen for default info window open, close ExtInfoWindow if open
		  map.InfoWindowListener = GEvent.addListener(map, "infowindowopen", 
		    function(event){
		      if( map.ExtInfoWindowInstance != null){
	          map.closeExtInfoWindow();
		      }
		    }
		  );
		}
		map.addOverlay(map.ExtInfoWindowInstance);
	}
};

/**
 * Remove the ExtInfoWindow instance
 * @param {GMap2} map The map where the GMarker and ExtInfoWindow exist
 */
GMarker.prototype.closeExtInfoWindow = function(map) {
	map.closeExtInfoWindow();
};

/**
 * Remove the ExtInfoWindow from the map
 */
GMap2.prototype.closeExtInfoWindow = function(){
  if( this.ExtInfoWindowInstance != null){
    GEvent.trigger(this, "extinfowindowbeforeclose");
  	this.ExtInfoWindowInstance.remove();
  	this.ExtInfoWindowInstance = null;
	}
};