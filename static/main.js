var line;
var point;
var raster = new Raster('picture');
var drawing_line = false;
var drawing_node = false;
var history = [];
var linePrefix = 'line';
var lineRegex = new RegExp('^' + linePrefix);
var lineCount = 0;
var nodePrefix = 'node';
var nodeRegex = new RegExp('^' + nodePrefix);
var intersectionPrefix = 'intersection';
var intersectionRegex = new RegExp('^' + intersectionPrefix);
var nodeCount = 0;

var bottomSection = document.getElementById('bottom-section');

function updateStats() {
    if (!document.getElementById('stats'))
        return;

    items = project.getItems({name: lineRegex});
    var stats = items.length + ' lines, ';
    items = project.getItems({name: intersectionRegex});
    var stats = stats +  items.length + ' intersections, ';
    items = project.getItems({name: nodeRegex});
    var stats = stats + items.length + ' nodes';

    document.getElementById('stats').innerText = stats;
}

function loadRaster(img_width, img_height) {
    if (raster)
        raster.remove();

    raster = new Raster('picture');
    raster.position = view.center;
    raster.selected = false;


    // Scales the photo to the fullest extent possible with the paper size
    var widthRatio = (paper.view.bounds.width - 50) / img_width;
    var heightRatio = (paper.view.bounds.height - 50) / img_height;
    var scale = Math.min(widthRatio, heightRatio);
    raster.scale(scale, scale);
}

function onResize(event) {
    var width = window.innerWidth;
    var height = window.innerHeight * 0.8;
    paper.view.setViewSize(width, height);

    var img = document.getElementById('picture');
    loadRaster(img.naturalWidth, img.naturalHeight);
}

function handleElementParams(combinedElements) {
    for (var i = 0; i < combinedElements.length; i++) {
        combinedElements[i].selected = false;
    }

    var getElementParameters = function(el) {
        var parameterInput = document.getElementById('parameter-input');
        var detailsLabel = document.getElementById('details');
        detailsLabel.innerText = 'Details for ' + el.name; 

        if (el.name.match(lineRegex)) {
            el.selected = true;

            parameterInput.innerHTML = '';

            parameterInput.append(createElementFromHtml(createTypeElementInput('linestring_generics', true)));
            parameterInput.append(createElementFromHtml(createTypeElementInput(elementTypes['linestring_generics'][0] + '_subtypes', false)));
            parameterInput.append(createElementFromHtml('<div><label>Additional OSM Tag</label><input id="tag-key" type="text"></input></div>'));
            parameterInput.append(createElementFromHtml('<div><label>Tag Value</label><input id="tag-value" type="text"></input></div>'));

            document.getElementById('generic-type').onchange = function(){
                var value = document.getElementById('generic-type').value;
                document.getElementById('subtype-div').replaceWith(createElementFromHtml(createTypeElementInput(value + '_subtypes', false)));
            }
        } else if (el.name.match(nodeRegex)) {
            el.selected = true;

            parameterInput.innerHTML = '';

            parameterInput.append(createElementFromHtml(createTypeElementInput('node_generics', true)));
            parameterInput.append(createElementFromHtml(createTypeElementInput(elementTypes['node_generics'][0] + '_subtypes', false)));
            parameterInput.append(createElementFromHtml('<label>Additional OSM Tag</label>'));
            parameterInput.append(createElementFromHtml('<input id="tag-key" type="text"></input>'));
            parameterInput.append(createElementFromHtml('<label>Tag Value</label>'));
            parameterInput.append(createElementFromHtml('<input id="tag-value" type="text"></input>'));

            document.getElementById('generic-type').onchange = function(){
                var value = document.getElementById('generic-type').value;
                document.getElementById('subtype-div').replaceWith(createElementFromHtml(createTypeElementInput(value + '_subtypes', false)));
            }
        }
    }

    var html = '<section id="input-section"><h2 id="details"></h2><form id="parameter-input"></form><button id="next-step">Next Step</button></section>';
    bottomSection.appendChild(createElementFromHtml(html));

    // Lets the user input parameters for each element on the page
    document.getElementById('next-step').onclick = function() {
        if (document.getElementById('generic-type')) {
            var generic = document.getElementById('generic-type').value;
            var subtype = document.getElementById('subtype').value;
            var tagKey = document.getElementById('tag-key').value;
            var tagValue = document.getElementById('tag-value').value;
            var tag = tagKey == '' ? '' : tagKey + (tagValue == '' ? '' : ' ' + tagValue);
            var selected = project.getItem({selected: true, class: Path});
            initializeParameters(selected.name, {'generic_type': generic, 'subtype': subtype, 'tag': tag});
        }

        for (var i = 0; i < history.length; i++) {
            history[i].selected = false;
        }

        if (combinedElements.length > 0) {
            getElementParameters(combinedElements.pop());
        } else {
            var parameterInput = document.getElementById('parameter-input');
            parameterInput.innerHTML = '';

            loadBottomSection(3);
        }
    }

    getElementParameters(combinedElements.pop());
}

function handleRelationshipParams(combinedElements) {
    var html = '<section id="input-section"><h2 id="details"></h2><form id="parameter-input"></form><button id="next-step">Next Step</button></section>';
    bottomSection.appendChild(createElementFromHtml(html));

    var primaryElementsRemaining = combinedElements.slice(0);
    var primary = primaryElementsRemaining.pop();
    var secondaryElementsRemaining = primaryElementsRemaining.slice(0);

    var tempSecondaryElements = [];
    var lines = project.getItems({name: lineRegex});
    for (var i = 0; i < lines.length; i++) {
        if (primary.getIntersections(lines[i]).length > 0) {
            tempSecondaryElements.push(lines[i]);
        }
    }
    if (tempSecondaryElements.length > 0)
        secondaryElementsRemaining = tempSecondaryElements.slice(0);

    var secondary;

    function getRelationshipParams(primary, secondary) {
        if (primary.name == secondary.name)
            return;

        primary.selected = true;
        secondary.selected = true;

        var primarySegment = primary.firstSegment.point.y > primary.lastSegment.point.y ? primary.firstSegment : primary.lastSegment;
        var secondarySegment = secondary.firstSegment.point.y > secondary.lastSegment.point.y ? secondary.firstSegment : secondary.lastSegment;

        var primaryX = primarySegment.point.x;
        var primaryY = primarySegment.point.y;
        var secondaryX = secondarySegment.point.x;
        var secondaryY = secondarySegment.point.y;

        var x = Math.abs(primaryX - secondaryX) / 2;
        var y = Math.abs(primaryY - secondaryY) / 2;

        x += (primaryX > secondaryX ? secondaryX : primaryX);
        y += (primaryY > secondaryY ? secondaryY : primaryY);

        var text = new PointText(x, y);
        text.justification = 'center';
        text.fillColor = 'white';
        text.fontSize = '20';
        text.shadowColor = 'black';
        text.shadowBlur = '4';
        text.content = 'θ'; 
        text.name = 'angle-text';

        var curve = new Path({
            segments: [primarySegment, [x, y - 50], secondarySegment],
            strokeColor: 'blue',
            strokeWidth: '3',
            name: 'curve',
        });

        curve.smooth();

        var detailsLabel = document.getElementById('details');
        detailsLabel.innerText = 'Define the relationship between ' + primary.name + ' and ' + secondary.name; 

        var parameterInput = document.getElementById('parameter-input');
        if (primary.getIntersections(secondary).length == 0) {
            parameterInput.append(createElementFromHtml('<label>Max Distance (m)*</label>'));
            parameterInput.append(createElementFromHtml('<input type="text" id="max-distance"></input>'));
            parameterInput.append(createElementFromHtml('<label>Min Distance (m)</label>'));
            parameterInput.append(createElementFromHtml('<input type="text" id="min-distance"></input>'));
        }
        parameterInput.append(createElementFromHtml('<label>Angle</label>'));
        parameterInput.append(createElementFromHtml('<input type="text" id="angle"></input>'));
        parameterInput.append(createElementFromHtml('<label>+/-</label>'));
        parameterInput.append(createElementFromHtml('<input type="text" id="error"></input>'));
    }

    // Lets the user input parameters for each element on the page
    document.getElementById('next-step').onclick = function() {
        var angle = parseInt(document.getElementById('angle').value);
        var error = parseInt(document.getElementById('error').value);
        var maxDistance = document.getElementById('max-distance') ? parseInt(document.getElementById('max-distance').value) : 0;
        var minDistance = document.getElementById('min-distance') ? parseInt(document.getElementById('min-distance').value) : 0;

        if (isNaN(maxDistance)) {
            alert('For your computer\'s sake, distance is required.');
            return;
        }

        for (var i = 0; i < combinedElements.length; i++) {
            combinedElements[i].selected = false;
        }

        project.getItem({name: 'curve'}).remove();
        project.getItem({name: 'angle-text'}).remove();

        document.getElementById('parameter-input').innerHTML = '';

        angle = (isNaN(angle) || isNaN(error)) ? null : Math.abs(angle);
        error = (isNaN(angle) || isNaN(error)) ? null : Math.abs(error);

        var primaryParams = getParametersByName(primary.name);
        primaryParams[[secondary.name]] = {'max_distance': maxDistance, 'min_distance': minDistance, 'angle': angle, 'error': error};

        if (primary.getIntersections(secondary).length > 0) {
            if (primaryParams['intersections'] == undefined) {
                primaryParams['intersections'] = [secondary.name];
            } else {
                intersections = primaryParams['intersections'];
                intersections.push(secondary.name)
                primaryParams['intersections'] = intersections;
            }
        }

        initializeParameters(primary.name, primaryParams);

        if (secondaryElementsRemaining.length > 0) {
            secondary = secondaryElementsRemaining.pop();
            
            if (secondary != null) {
                getRelationshipParams(primary, secondary);
                return;
            }
        } else if (primaryElementsRemaining.length > 0) {
            primary = primaryElementsRemaining.pop();
            secondaryElementsRemaining = primaryElementsRemaining.slice(0);
            secondary = secondaryElementsRemaining.pop();

            if (secondary != null) {
                getRelationshipParams(primary, secondary);
                return;
            }
        }

        loadBottomSection(4);
    }

    secondary = secondaryElementsRemaining.pop();
    if (secondary != null)
        getRelationshipParams(primary, secondary);
    else
        loadBottomSection(4);

}

function loadBottomSection(stage) {
    if (stage == 1) {
        var html = '<section id="button-section"><button id="upload-photo">Upload Photo</button>';
        html += '<button id="add-node" disabled="true" title="Not yet implemented">Add Node</button><button id="add-linestring">Add Linestring</button>';
        html += '<button id="undo">Undo</button><button id="next-step">Next Step</button></section>';
        bottomSection.appendChild(createElementFromHtml(html));

        html = '<section id="info-section"><label id="instructions"></label><label id="stats"></label></section>';
        bottomSection.appendChild(createElementFromHtml(html));

        document.getElementById('upload-photo').onclick = function() {
            var input = document.createElement('input');
            input.type = 'file';

            input.onchange = function(e) {
                var file = e.target.files[0]; 
                var reader = new FileReader();
                reader.readAsDataURL(file);

                reader.onload = function(readerEvent) {
                    var content = readerEvent.target.result;

                    var img = new Image;
                    img.onload = function() {
                        document.getElementById('button-section').remove();
                        document.getElementById('info-section').remove();

                        document.getElementById('picture').src =  content;
                        loadRaster(img.width, img.height);
                        
                        for (var i = 0; i < history.length; i++) {
                            history[i].selected = false;
                            history[i].remove();
                        }
                        updateStats();
                    }
                    img.src = content;
                }
            }

            input.click();
        }

        document.getElementById('add-linestring').onclick = function() {
            drawing_node = false;
            drawing_line = true;
            document.getElementById('instructions').innerText = 'Click and drag to draw a line.';
        }

        document.getElementById('add-node').onclick = function() {
            drawing_line = false;
            drawing_node = true;
            document.getElementById('instructions').innerText = 'Click anywhere to place a node.';
        }

        document.getElementById('undo').onclick = function() {
            if (history.length == 0) 
                return;

            history.pop().remove();
            updateStats();
        }

        document.getElementById('next-step').onclick = function() {
            loadBottomSection(2);
        }
    } else if (stage == 2) {
        var lines = project.getItems({name: lineRegex});
        var nodes = project.getItems({name: nodeRegex});

        if ((lines.length < 2 && nodes.length == 0) || (nodes.length < 2 && lines.length == 0)) {
            alert('At least two lines, nodes, or a combination of each are required.');
            return;
        }

        bottomSection.innerHTML = '';
        handleElementParams(nodes.concat(lines));
    } else if (stage == 3) {
        var lines = project.getItems({name: lineRegex});
        var nodes = project.getItems({name: nodeRegex});

        bottomSection.innerHTML = '';
        handleRelationshipParams(nodes.concat(lines));
    } else if (stage == 4) {
        bottomSection.innerHTML = '';
        var query = constructQuery();
        bottomSection.appendChild(createElementFromHtml('<pre>'+query+'</pre>'));
    }
}

raster.on('load', function() {
    var img = document.getElementById('picture');
    img.src = '/static/sample_pictures/Massachusetts turnpike.jpg';
    img.style.display = 'none';

    img.onload = function() {
        loadRaster(img.naturalWidth, img.naturalHeight);

        raster.visible = true;
        raster.position = view.center;
        raster.selected = false;
        loadBottomSection(1);
    }
});

function onMouseDown(event) {
    if (!drawing_line && !drawing_node)
        return;

	// If we produced a line or point before, deselect it:
	if (line) {
		line.selected = false;
	}

    if (point) {
        point.selected = false;
    }

    if (drawing_node) {
        nodeCount++;

        point = new Path.Circle(new Point(event.point), 10);
        point.strokeColor = 'yellow';
        point.fillColor = 'firebrick';
        point.strokeWidth = 1;
        point.selected = true;
        point.name = nodePrefix + '' + nodeCount;

        var text = new PointText(event.point.x, event.point.y - 15);
        text.justification = 'center';
        text.fillColor = 'white';
        text.fontSize = '15';
        text.shadowColor = 'black';
        text.shadowBlur = '4';
        text.content = point.name; 

        var group = new Group([point]);
        group.addChild(text);

        drawing_node = false;
        history.push(group);
        updateStats();
        return;
    }

    lineCount++;

	line = new Path.Line({
		segments: [event.point, event.point],
		strokeColor: 'black',
        strokeWidth: 5,
		selected: true,
        name: linePrefix + '' + lineCount
    });
}

function onMouseDrag(event) {
    if (!drawing_line || !line)
        return;

    line.removeSegment(1);
    line.insert(1, event.point);
}

function onMouseUp(event) {
    if (!drawing_line || !line)
        return;

    line.removeSegment(1);
    line.insert(1, event.point);

    // Used to group the line with any intersections, for removal later if undo is hit
    var group = new Group([line]);

    var text = new PointText(event.point);
    text.justification = 'center';
    text.fillColor = 'white';
    text.fontSize = '20';
    text.shadowColor = 'black';
    text.shadowBlur = '4';
    text.content = line.name; 
    group.addChild(text);

    // Finds intersections and adds a circle at that point
    items = project.getItems({name: lineRegex});
    for (var i = 0; i < items.length; i++) {
        if (line.name != items[i].name) {
            var intersections = line.getIntersections(items[i]);
            if (intersections.length > 0) {
                var circle = new Path.Circle({
                    center: intersections[0].point,
                    radius: 10,
                    fillColor: 'orange',
                    name: intersectionPrefix + ' ' + line.name + ' ' + items[i].name
                });
                group.addChild(circle)
            }
        }
    }

    history.push(group);
    drawing_line = false;
    updateStats();
}
