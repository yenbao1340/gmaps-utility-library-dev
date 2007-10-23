/*
* ExtInfoWindow Class 
*  Copyright (c) 2007, Joe Monahan (jmonahan167@gmail.com)
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
 *    {Number} paddingX The padding size in pixels that the info window will leave on 
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
	  tl:{},
	  t:{},
	  tr:{},
	  l:{},
	  r:{},
	  bl:{},
	  b:{},
	  br:{},
	  beak:{},
	  close:{}
	};
	for( i in this.wrapperParts ){
		var tempElement = document.createElement("div");
		tempElement.id = this.infoWindowId+"_"+i;
		tempElement.style.visibility="hidden";
		document.body.appendChild(tempElement);
		tempElement = document.getElementById(this.infoWindowId+"_"+i);
		var tempWrapperPart = this.wrapperParts.eval(i);
		tempWrapperPart.w = this.getStyle_(tempElement,"width") != "0px" ? stripOutUnit(this.getStyle_(tempElement, "width")) : 0;
		tempWrapperPart.h = this.getStyle_(tempElement, "height") != "0px" ? stripOutUnit(this.getStyle_(tempElement, "height")) : 0;
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
	
	this.contentDiv = this.initContents_();
	this.wrapperDiv = null;

  //Steal mouse down event to keep mouse clicks and mouse click and drag from being passed
  //down the event stack to the map.  Without this you could click and drag around the map
  //from inside the extInfoWindow
	GEvent.bindDom(this.container,"mousedown",this,this.onClick_);

	if( this.ajaxUrl != null ){
		this.ajaxRequest_(this.ajaxUrl);
	}
};

/**
 * Private function to steal mouse click events to prevent it from returning to the map.
 * Without this links in the info window would not work.
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

	this.contentDiv.style.visibility='visible';

	

	//create the wrapper for the window
	if( this.wrapperDiv == null ){
	  this.wrapperDiv = document.createElement("div");
	  this.container.appendChild(this.wrapperDiv);
  }

	//Finish configuring wrapper parts that were not set in initialization
	this.wrapperParts.tl.l = 0;
	this.wrapperParts.tl.t = 0;
	this.wrapperParts.t.l =this.wrapperParts.tl.w;
	this.wrapperParts.t.t = 0;
	this.wrapperParts.t.w = (this.wrapperParts.l.w + this.contentWidth + this.wrapperParts.r.w)-this.wrapperParts.tl.w-this.wrapperParts.tr.w;
	this.wrapperParts.t.h = this.wrapperParts.tl.h;
	this.wrapperParts.tr.l = this.wrapperParts.t.w + this.wrapperParts.tl.w;
	this.wrapperParts.tr.t = 0;
	this.wrapperParts.l.l = 0;
	this.wrapperParts.l.t = this.wrapperParts.tl.h;
	this.wrapperParts.l.h = contentHeight;
	this.wrapperParts.r.l = this.contentWidth+this.wrapperParts.l.w;
	this.wrapperParts.r.t = this.wrapperParts.tr.h;
	this.wrapperParts.r.h = contentHeight;
	this.wrapperParts.bl.l = 0;
	this.wrapperParts.bl.t = contentHeight + this.wrapperParts.bl.h;
	this.wrapperParts.b.l = this.wrapperParts.br.w;
	this.wrapperParts.b.t = contentHeight + this.wrapperParts.bl.h;
	this.wrapperParts.b.w = (this.wrapperParts.l.w + this.contentWidth + this.wrapperParts.r.w) - this.wrapperParts.bl.w - this.wrapperParts.br.w;
	this.wrapperParts.b.h = this.wrapperParts.bl.h;
	this.wrapperParts.br.l = this.wrapperParts.b.w + this.wrapperParts.bl.w;
	this.wrapperParts.br.t = contentHeight + this.wrapperParts.br.h;
	this.wrapperParts.close.l = this.wrapperParts.tr.l +this.wrapperParts.tr.w - this.wrapperParts.close.w - this.borderSize;
	this.wrapperParts.close.t = this.borderSize;
	this.wrapperParts.beak.l = (this.contentWidth/2) - (this.wrapperParts.beak.w/2);
	this.wrapperParts.beak.t = this.wrapperParts.bl.t + this.wrapperParts.bl.h - this.borderSize;

	//create the decoration wrapper DOM objects
	//append the styled info window to the container
	for (i in this.wrapperParts) {
  	if( i == "close" ){
			//first append the content so the close button is layered above
			this.wrapperDiv.appendChild(this.contentDiv);
		}
	  var wrapperPartsDiv = null;
	  if( this.wrapperParts[i].el == null){
      wrapperPartsDiv = document.createElement('div');
      this.wrapperDiv.appendChild(wrapperPartsDiv);
	  }else{
	    wrapperPartsDiv = this.wrapperParts[i].el;
    }
		wrapperPartsDiv.id = this.infoWindowId+"_"+i;
		wrapperPartsDiv.style.position='absolute';
		wrapperPartsDiv.style.width= this.wrapperParts[i].w+"px";
		wrapperPartsDiv.style.height= this.wrapperParts[i].h+"px";
		wrapperPartsDiv.style.top=this.wrapperParts[i].t+'px';
		wrapperPartsDiv.style.left=this.wrapperParts[i].l+'px';

		this.wrapperParts[i].el = wrapperPartsDiv;
	}

	//add event handlers like the close box
	var currentMarker = this.marker;
	GEvent.addDomListener(this.wrapperParts.close.el, "click", 
	  function() {
		  currentMarker.closeExtInfoWindow();
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
	
	this.container.style.border = '0';
	this.container.style.margin = '0';
	this.container.style.padding = '0';
	this.container.style.display = 'block';

	if(map.ExtInfoWindowInstance != null) {
		//this.resize();
		this.repositionMap(this.contentWidth, contentHeight);
	}
};

/**
 * Determine the dimensions of the contents to recalculate and reposition the 
 * wrapping decorator elements accordingly.
 */
ExtInfoWindow.prototype.resize = function(){
	//get the new content's height
	var contentHeight = this.contentDiv.offsetHeight;
	var contentWidth = this.contentDiv.offsetWidth;
	var pixelLocation = this.map.fromLatLngToDivPixel(this.marker.getPoint());

	var oldWindowHeight = this.wrapperParts.t.el.offsetHeight + this.wrapperParts.l.el.offsetHeight + this.wrapperParts.b.el.offsetHeight;
	var oldWindowPosTop = this.wrapperParts.t.el.offsetTop;
	
	this.wrapperParts.l.el.style.height = contentHeight + "px";
	this.wrapperParts.r.el.style.height = contentHeight + "px";

	//shrink down info window to look correct for new height
	var newPosTop = this.wrapperParts.b.el.offsetTop - contentHeight;
	this.wrapperParts.l.el.style.top = newPosTop + "px";
	this.wrapperParts.r.el.style.top = newPosTop + "px";
	this.contentDiv.style.top = newPosTop + "px";

	windowTHeight = this.wrapperParts.t.el.style.height;
	windowTHeight = windowTHeight.substring(0, windowTHeight.indexOf("px") );
	newPosTop -= windowTHeight;
	this.wrapperParts.close.el.style.top = newPosTop + this.borderSize + "px";
	this.wrapperParts.tl.el.style.top = newPosTop + "px";
	this.wrapperParts.t.el.style.top = newPosTop + "px";
	this.wrapperParts.tr.el.style.top = newPosTop + "px";

	var newWindowHeight = this.wrapperParts.t.el.offsetHeight + this.wrapperParts.l.el.offsetHeight + this.wrapperParts.b.el.offsetHeight;
	var newWindowPosTop = this.wrapperParts.t.el.offsetTop;
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

	//test top of screen	
	var windowT = this.wrapperParts.t.el;
	var windowL = this.wrapperParts.l.el;
	var windowB = this.wrapperParts.b.el;
	var windowR = this.wrapperParts.r.el;
	var windowBeak = this.wrapperParts.beak.el;

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
	var offsetRight = Math.round(markerPosition.x + this.marker.getIcon().iconSize.width/2 + this.getDimensions_(this.container).width/2 + this.getDimensions_(windowR).width + this.borderSize + this.paddingX);
	if(offsetRight > mapNE.x) {
		panX = -( offsetRight - mapNE.x);
	}else{
		//test left of screen
		var offsetLeft = - (Math.round( (this.getDimensions_(this.container).width/2 - this.marker.getIcon().iconSize.width/2) + this.getDimensions_(windowL).width + this.borderSize + this.paddingX) - markerPosition.x);
		if( offsetLeft < mapSW.x) {
			panX = mapSW.x - offsetLeft;
		}
	}

	if(panX!=0 || panY!=0 && map.ExtInfoWindowInstance != null ) {
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
	request.onreadystatechange = function(){
		if (request.readyState == 4) {
			result = request.responseText;
			var infoWindow = document.getElementById(map.ExtInfoWindowInstance.infoWindowId+"_contents");
			try{
				infoWindow.innerHTML = result;
				map.ExtInfoWindowInstance.resize();
			}catch(err){
				//An error will occur here if the ExtInfoWindow is closed after the ajax call was kicked off
				//and before the contents could be updated.  For now just throw it away.
			}
		}
	}
	request.send(null);
	//GEvent.trigger(this, "ajaxcomplete");
};

/**
 * Private function that intitializes the contents region of the ExtInfoWindow
 * @return {HTMLDivElement} 
 */
ExtInfoWindow.prototype.initContents_ = function(){
	var content = document.createElement("div");
	content.id=this.infoWindowId+"_contents";
	content.innerHTML = this.html;
	content.style.margin='0';
	content.style.padding='0';
	content.style.border='0';
	content.style.display='block';

	//make it invisible for now
	content.style.visibility='hidden';

	//temporarily append the content to the map container
	this.map.getContainer().appendChild(content);
	
	this.contentWidth = this.getDimensions_(this.container).width;
	var contentHeight = content.offsetHeight;
	//set the width and height to ensure they
	//stay that size when drawn again
  content.style.width=this.contentWidth+'px';

	//set up the actual position relative to your images
	content.style.position='absolute';
	content.style.left=this.wrapperParts.l.w+'px';
	content.style.top=this.wrapperParts.tl.h+'px';
	content.style.background='#FFF';

	return content;
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
	var testFloatStyles = ['float','cssFloat'];
    for( i = 0; i < testFloatStyles.length; i++ ){
	    value = testFloatStyles[i];
		  if (!found && value == style) {
        found = true;
		  }
    }
    if(found){
      style = (typeof element.style.styleFloat != 'undefined' ? 'styleFloat' : 'cssFloat');
	  }
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

    if((value == 'auto') && ['width','height'].include(style) && (this.getStyle_(element, 'display') != 'none')){
      value = element['offset'+style.capitalize()] + 'px';
    }

    if (window.opera && ['left', 'top', 'right', 'bottom'].include(style)){
      if (this.getStyle_(element, 'position') == 'static') value = 'auto';
    }
    if(style == 'opacity') {
      if(value) return parseFloat(value);
      if(value = (this.getStyle_(element, 'filter') || '').match(/alpha\(opacity=(.*)\)/)){
        if(value[1]) return parseFloat(value[1]) / 100;
      }
      return 1.0;
    }
    return value == 'auto' ? null : value;
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
GMarker.prototype.openExtInfoWindow = function(cssId, html, opt_opts) {
	map.closeInfoWindow();
	if(map.ExtInfoWindowInstance != null) {
		map.ExtInfoWindowInstance.remove();
		map.ExtInfoWindowInstance = null;
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
						map.ExtInfoWindowInstance.remove();
						map.ExtInfoWindowInstance = null;
					}
				}
			);
		}
		if( map.InfoWindowListener == null){
		  //listen for default info window open, close ExtInfoWindow if open
		  map.InfoWindowListener = GEvent.addListener(map, "infowindowopen", 
		    function(event){
		      if( map.ExtInfoWindowInstance != null){
	          map.ExtInfoWindowInstance.remove();
						map.ExtInfoWindowInstance = null;
		      }
		    }
		  );
		}
		
		map.addOverlay(map.ExtInfoWindowInstance);
	}
};

/**
 * Remove the ExtInfoWindow instance 
 */
GMarker.prototype.closeExtInfoWindow = function() {
	if(map.ExtInfoWindowInstance != null) {
		map.ExtInfoWindowInstance.remove();
		map.ExtInfoWindowInstance = null;
	}
};

/**
 * Helper function that removes trailing "px" from argument and returns only the integer value
 * @param {String} stringWithUnit The String that will have it's trailing "px" unit removed
 * @return {Number}
 */
function stripOutUnit(stringWithUnit){
	return stringWithUnit.substring(0, stringWithUnit.length-2) - 0;
};