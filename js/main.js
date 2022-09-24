var line;
var point;
var raster = new Raster('picture');
var drawing_line = false;
var drawing_node = false;
var history = [];

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
}

document.getElementById('add-node').onclick = function() {
    drawing_line = false;
    drawing_node = true;
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

var textItem = new PointText({
	content: 'Click and drag to draw a line.',
	point: new Point(0, view.viewSize.height),
	fillColor: 'black',
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


	// Create a new path and set its stroke color to black:
	line = new Path.Line({
		segments: [event.point, event.point],
		strokeColor: 'black',
        strokeWidth: 5,
		fullySelected: true
    });
}

function onMouseDrag(event) {
    if (!drawing_line || !line)
        return;

    line.removeSegment(1);
    line.insert(1, event.point);
}

// While the user drags the mouse, points are added to the path
// at the position of the mouse:
function onMouseUp(event) {
    if (!drawing_line || !line)
        return;

    line.removeSegment(1);
    line.insert(1, event.point);

    history.push(line);
    drawing_line = false;

	// Update the content of the text item to show how many
	// segments it has:
	textItem.content = 'Segment count: ' + line.segments.length;
}
