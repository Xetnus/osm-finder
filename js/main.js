var line;
var point;
var raster = new Raster('picture');
var drawing_line = false;
var drawing_node = false;
var history = [];
var linePrefix = 'line';
var lineCount = 0;

function load_raster(img_width, img_height) {
    if (raster)
        raster.remove();

    raster = new Raster('picture');
    raster.position = view.center;

    var widthRatio = paper.view.bounds.width / img_width;
    var heightRatio = paper.view.bounds.height / img_height;
    var scale = Math.min(widthRatio, heightRatio);
    raster.scale(scale, scale);
}

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
                load_raster(img.width, img.height);
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
}

document.getElementById('next-step').onclick = function() {
}

raster.on('load', function() {
    raster.visible = true;
    raster.position = view.center;
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
        point = new Path.Circle(new Point(event.point), 10);
        point.strokeColor = 'yellow';
        point.fillColor = 'firebrick';
        point.strokeWidth = 1;
        point.fullySelected = true;

        drawing_node = false;
        history.push(point);
        return;
    }

    lineCount++;

	line = new Path.Line({
		segments: [event.point, event.point],
		strokeColor: 'black',
        strokeWidth: 5,
		fullySelected: true,
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

    items = project.getItems({name: /^line/});
    for (var i = 0; i < items.length; i++) {
        if (line.name != items[i].name) {
            var intersections = line.getIntersections(items[i]);
            if (intersections.length > 0) {
                var circle = new Path.Circle({
                    center: intersections[0].point,
                    radius: 10,
                    fillColor: 'orange',
                    name: 'intersection: ' + line.name + ' ' + items[i].name
                });
                group.addChild(circle)
            }
        }
    }

    history.push(group);
    drawing_line = false;
}
