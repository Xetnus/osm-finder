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

function handleElementParams(combinedElements) {
    for (var i = 0; i < combinedElements.length; i++) {
        combinedElements[i].selected = false;
    }


    var getElementParameters = function(el) {
        var parameterInput = document.getElementById('parameter-input');
        if (el.name.match(lineRegex)) {
            el.selected = true;

            parameterInput.innerHTML = '';

            parameterInput.append(createElementFromHtml(createTypeElementInput('linestring_generics', true)));
            parameterInput.append(createElementFromHtml(createTypeElementInput(elementTypes['linestring_generics'][0] + '_subtypes', false)));

            document.getElementById('generic-type').onchange = function(){
                var value = document.getElementById('generic-type').value;
                document.getElementById('subtype-div').replaceWith(createElementFromHtml(createTypeElementInput(value + '_subtypes', false)));
            }

        } else if (el.name.match(intersectionRegex)) {
            el.selected = true;
            parameterInput.innerHTML = '';
            parameterInput.append(createElementFromHtml('<section id="intersection-type"></section>'));
        } else if (el.name.match(nodeRegex)) {
            el.selected = true;

            parameterInput.innerHTML = '';

            parameterInput.append(createElementFromHtml(createTypeElementInput('node_generics', true)));
            parameterInput.append(createElementFromHtml(createTypeElementInput(elementTypes['node_generics'][0] + '_subtypes', false)));

            document.getElementById('generic-type').onchange = function(){
                var value = document.getElementById('generic-type').value;
                document.getElementById('subtype-div').replaceWith(createElementFromHtml(createTypeElementInput(value + '_subtypes', false)));
            }
        }
    }

    var html = '<section id="input-section"><section id="parameter-input"></section><button id="next-step">Next Step</button></section>';
    bottomSection.appendChild(createElementFromHtml(html));

    // Lets the user input parameters for each element on the page
    document.getElementById('next-step').onclick = function() {
        if (document.getElementById('generic-type')) {
            var generic = document.getElementById('generic-type').value;
            var subtype = document.getElementById('subtype').value;
            var selected = project.getItem({selected: true, class: Path});
            initializeParameters(selected.name, {'generic_type': generic, 'subtype': subtype});
        } else if (document.getElementById('intersection-type')) {
            var selected = project.getItem({selected: true, class: Path});
            initializeParameters(selected.name, {'generic_type': 'test', 'subtype': 'test'});
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
    var html = '<section id="input-section"><section id="parameter-input"></section><button id="next-step">Next Step</button></section>';
    bottomSection.appendChild(createElementFromHtml(html));

    var primaryElementsRemaining = combinedElements.slice(0);
    var primary = primaryElementsRemaining.pop();
    var secondaryElementsRemaining = primaryElementsRemaining.slice(0);
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

        var parameterInput = document.getElementById('parameter-input');
        parameterInput.append(createElementFromHtml('<label>Max Distance (m)</label>'));
        parameterInput.append(createElementFromHtml('<input type="text" id="distance"></input>'));
        parameterInput.append(createElementFromHtml('<label>Angle</label>'));
        parameterInput.append(createElementFromHtml('<input type="text" id="angle"></input>'));
        parameterInput.append(createElementFromHtml('<label>+/-</label>'));
        parameterInput.append(createElementFromHtml('<input type="text" id="error"></input>'));
    }

    // Lets the user input parameters for each element on the page
    document.getElementById('next-step').onclick = function() {
        for (var i = 0; i < combinedElements.length; i++) {
            combinedElements[i].selected = false;
        }

        var angle = parseInt(document.getElementById('angle').value);
        var error = parseInt(document.getElementById('error').value);
        var distance = parseInt(document.getElementById('distance').value);

        if (isNaN(distance)) {
            alert('For your sake, distance is required.');
            return;
        }

        document.getElementById('parameter-input').innerHTML = '';

        angle = (isNaN(angle) || isNaN(error)) ? '' : ' ' + Math.abs(angle);
        error = (isNaN(angle) || isNaN(error)) ? '' : ' ' + Math.abs(error);
        var primaryParams = getParametersByName(primary.name);
        primaryParams[[secondary.name]] = distance + angle + error;
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

}

function loadBottomSection(stage) {
    if (stage == 1) {
        var html = '<section id="button-section"><button id="upload-photo">Upload Photo</button>';
        html += '<button id="add-node">Add Node</button><button id="add-linestring">Add Linestring</button>';
        html += '<button id="undo">Undo</button><button id="next-step">Next Step</button></section>';
        html += '<section id="info-section"><label id="instructions"></label><label id="stats"></label></section>';
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
        var intersections = project.getItems({name: intersectionRegex});
        var nodes = project.getItems({name: nodeRegex});

        if (lines.length == 0 && nodes.length == 0) {
            alert('At least one line or node is required.');
            return;
        }

        bottomSection.innerHTML = '';
        handleElementParams(nodes.concat(intersections).concat(lines));
    } else if (stage == 3) {
        var lines = project.getItems({name: lineRegex});
        var intersections = project.getItems({name: intersectionRegex});
        var nodes = project.getItems({name: nodeRegex});

        bottomSection.innerHTML = '';
        handleRelationshipParams(nodes.concat(intersections).concat(lines));
    } else if (stage == 4) {
        bottomSection.innerHTML = '';
        var query = constructQuery();
        bottomSection.appendChild(createElementFromHtml('<pre>'+query+'</pre>'));
    }
}

raster.on('load', function() {
    raster.visible = true;
    raster.position = view.center;
    raster.selected = false;
    loadBottomSection(1);
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
                    name: intersectionPrefix + ': ' + line.name + ' ' + items[i].name
                });
                group.addChild(circle)
            }
        }
    }

    history.push(group);
    drawing_line = false;
    updateStats();
}
