var line;
var point;
var raster = new Raster('picture');
var drawing_line = false;
var drawing_node = false;
var first_point;

raster.on('load', function() {
    // document.getElementsByTagName("body")[0].style.height = document.getElementById("picture").style.height;  
    // document.getElementsByTagName("body")[0].style.weight = document.getElementById("picture").style.weight;  

    // paper.view.size = raster.size;
    raster.visible = true;
    raster.position = view.center;
});

var textItem = new PointText({
	content: 'Click and drag to draw a line.',
	point: new Point(0, view.viewSize.height),
	fillColor: 'black',
});

function onKeyUp(event) {
    if(event.key == 'l') {
        drawing_node = false;
        drawing_line = true;
    } else if(event.key == 'n') {
        drawing_line = false;
        drawing_node = true;
    }
}

function onMouseDown(event) {
    if (!drawing_line && !drawing_node)
        return;

    if (drawing_node) {
        point = new Path.Circle(new Point(event.point), 10);
        point.strokeColor = 'yellow';
        point.fillColor = 'firebrick';
        point.strokeWidth = 1;
        drawing_node = false;
        return;
    }

	// If we produced a path before, deselect it:
	if (line) {
		line.selected = false;
	}

    first_point = event.point;
}

// While the user drags the mouse, points are added to the path
// at the position of the mouse:
function onMouseUp(event) {
    if (!drawing_line || !first_point)
        return;

	// Create a new path and set its stroke color to black:
	line = new Path.Line({
		segments: [first_point, event.point],
		strokeColor: 'black',
        strokeWidth: 5,
		fullySelected: true
	});

    first_point = null;
    drawing_line = false;

	// Update the content of the text item to show how many
	// segments it has:
	textItem.content = 'Segment count: ' + line.segments.length;
}
