<script>
import {calculateIntersection, calculatePolygonCentroid,
        getLineLength, getPointAtDistance, getUniquePairs, 
        debounce, clipPolygons} from '../assets/generalTools.js'

  export default {
    props: ['image', 'programStage', 'annotations', 'drawingState'],
    emits: ['annotationsChange', 'drawingStateChange', 'warn'],
    data() {
      return {
        stageConfig: {
          width: null,
          height: null,
        },
        activeLine: [],                  // [[x1, y1], [x2, y2]] for line currently being drawn
        activeCircle: [],                // [[x1, y1], [x2, y2]] for circle currently being drawn
        activeRectangle: [],             // [[x1, y1], [x2, y2]] for rectangle currently being drawn
        activePolygon: [],               // [[x1, y1], [x2, y2], ...] for polygon currently being drawn
        activeIntersections: [],         // Array of arrays for any intersections on the line being drawn
        activeJoints: [],                // Array of arrays for any joints that connect lines of a shape
        anim: new Konva.Animation(),
      };
    },
    created() {
      var resize = debounce(this.resize);
      window.addEventListener('resize', resize);
    },
    computed: {
      imageConfig() {
        this.image; // Forces the computed value to re-render when this.image changes

        const canvas = document.querySelector('#canvas-section');
        if (!canvas || !this.image) 
          return {};

        this.stageConfig.height = canvas.offsetHeight;
        this.stageConfig.width = canvas.offsetWidth;

        const heightRatio = (this.stageConfig.height - 50) / this.image.height;
        const widthRatio = (this.stageConfig.width - 50) / this.image.width;
        const scale = Math.min(widthRatio, heightRatio);
        const height = this.image.height * scale;
        const width = this.image.width * scale;

        // Centers image
        const x = Math.abs(this.stageConfig.width - width) / 2;
        const y = Math.abs(this.stageConfig.height - height) / 2;

        return {image: this.image, height: height, width: width, x: x, y: y, 
          shadowBlur: 40, shadowColor: 'black'};
      },

      intersections() {
        const uniquePairs = getUniquePairs(this.annotations.filter((a) => a.geometryType == 'linestring'))
        let intersections = []

        for (let i = 0; i < uniquePairs.length; i++) {
          let first = uniquePairs[i].first;
          let second = uniquePairs[i].second;
          let intersection = calculateIntersection(first.points, second.points);
          if (intersection && intersection.intersects) {
            let state = 'default';
            if (first.state === 'transparent' || second.state === 'transparent') {
              state = 'transparent';
            }

            intersections.push({
              state: state,
              x: intersection.x, y: intersection.y,
              first: first, second: second,
            });
          }
        }
        return intersections;
      }
    },
    methods: {
      // Resets temporary variables
      resetActiveVariables() {
        this.activeLine = [];
        this.activeCircle = [];
        this.activeRectangle = [];
        this.activeIntersections = [];
        this.activeJoints = [];
        this.activePolygon = [];
      },

      getLineConfig(line) {
        let opacity =  1;
        let shadowEnabled = true;
        
        if (line.state === 'transparent' || line.state === 'transparent-but-related') {
          opacity = 0.3;
          shadowEnabled = false;
        }

        return {stroke: 'black', strokeWidth: 5, points: line.points.flat(1), opacity: opacity, 
                shadowEnabled: shadowEnabled, shadowBlur: 3, shadowColor: 'cyan'}
      },

      getShapeConfig(shape) {
        let opacity =  0.7;

        if (shape.state === 'transparent' || shape.state === 'transparent-but-related') {
          opacity = 0.2;
        }

        return {closed: true, stroke: 'black', fill: 'blue', lineJoin: 'round', opacity: opacity,
                dashEnabled: !shape.completed, dash: [15, 15], strokeWidth: 3, 
                points: shape.points.flat(1)}
      },

      getNodeConfig(node) {
        const opacity = node.state === 'transparent' ? 0.2 : 1;
        return {fill: 'midnightblue', stroke: 'lightblue', radius: 10, strokeWidth: 3,
                x: node.points[0][0], y: node.points[0][1], opacity: opacity}
      },

      getActiveLineConfig(points) {
        // If the user cancels the drawing operation, reset active variables
        if (this.drawingState === 'none') {
          this.resetActiveVariables();
          return {};
        }

        return {stroke: 'black', strokeWidth: 3, points: points.flat(1)}
      },

      getActiveCircleConfig(points) {
        // If the user cancels the drawing operation, reset active variables
        if (this.drawingState === 'none') {
          this.resetActiveVariables();
          return {};
        }

        let radius = getLineLength(...points.flat(1));

        return {stroke: 'black', strokeWidth: 3, fill: 'cyan', opacity: 0.2, 
                x: points[0][0], y: points[0][1], radius: radius}
      },

      getActiveRectangleConfig(cornerPoints) {
        // If the user cancels the drawing operation, reset active variables
        if (this.drawingState === 'none') {
          this.resetActiveVariables();
          return {};
        }

        let points = [
                      [cornerPoints[0][0], cornerPoints[0][1]],
                      [cornerPoints[0][0], cornerPoints[1][1]],
                      [cornerPoints[1][0], cornerPoints[1][1]],
                      [cornerPoints[1][0], cornerPoints[0][1]],
                      [cornerPoints[0][0], cornerPoints[0][1]]
                    ];

        return {stroke: 'black', strokeWidth: 3, fill: 'cyan', opacity: 0.2, closed: true,
                points: points.flat(1)} 
      },

      getActivePolygonConfig(points) {
        // If the user cancels the drawing operation, reset active variables
        if (!this.drawingState.endsWith('polygon')) {
          this.resetActiveVariables();
          return {};
        }

        return {stroke: 'black', strokeWidth: 3, points: points.flat(1)} 
      },

      getActiveShapeConfig(shape) {
        return {closed: true, stroke: 'black', fill: 'blue', lineJoin: 'round', 
                opacity: 0.7, strokeWidth: 3, points: shape.flat(1), dashEnabled: true, dash: [30, 10]}
      },

      getIntersectionConfig(intersection) {
        return {
          fill: 'orange', stroke: 'yellow',
          opacity: intersection.state === 'transparent' ? 0.2 : 1,
          radius: 6, strokeWidth: 2,
          x: intersection.x, y: intersection.y
        };
      },

      calculateAngleConfig(line1, line2) {
        let intersection = calculateIntersection(line1, line2);
        if (!intersection) return {};

        // Finds the longest segment of line1, assuming the line is split at the intersection
        const temp1Len1 = getLineLength(intersection.x, intersection.y, line1[0][0], line1[0][1]);
        const temp2Len1 = getLineLength(intersection.x, intersection.y, line1[1][0], line1[1][1]);
        let line1Seg = 1;
        let len1 = temp2Len1;

        if (temp1Len1 > temp2Len1) {
          line1Seg = 0;
          len1 = temp1Len1;
        }

        // Finds the longest segment of line2, assuming the line is split at the intersection
        const temp1Len2 = getLineLength(intersection.x, intersection.y, line2[0][0], line2[0][1]);
        const temp2Len2 = getLineLength(intersection.x, intersection.y, line2[1][0], line2[1][1]);
        let line2Seg = 1;
        let len2 = temp2Len2;

        if (temp1Len2 > temp2Len2) {
          line2Seg = 0;
          len2 = temp1Len2;
        }

        // Determines the shortest segment between each line's longest segment
        const minLen = len1 > len2 ? len2 : len1;

        // Determines where the angle path intersects the lines
        const point1 = [intersection.x, intersection.y];
        const line1d = getPointAtDistance(point1, [line1[line1Seg][0], line1[line1Seg][1]], minLen / 3);
        const line2d = getPointAtDistance(point1, [line2[line2Seg][0], line2[line2Seg][1]], minLen / 3);

        // Determines the 'height' of the angle path
        const line1_control = getPointAtDistance(point1, [line1[line1Seg][0], line1[line1Seg][1]], minLen / 2);
        const line2_control = getPointAtDistance(point1, [line2[line2Seg][0], line2[line2Seg][1]], minLen / 2);
        const controlX = line2_control.x + (line1_control.x - line2_control.x) / 2;
        const controlY = line2_control.y + (line1_control.y - line2_control.y) / 2;

        // Uses code from: https://konvajs.org/docs/sandbox/Modify_Curves_with_Anchor_Points.html
        return {
          stroke: 'crimson',
          strokeWidth: 2,
          sceneFunc: (ctx, shape) => {
            ctx.beginPath();
            ctx.moveTo(line1d.x, line1d.y);
            ctx.quadraticCurveTo(controlX, controlY, line2d.x, line2d.y);
            ctx.fillStrokeShape(shape);
          },
        }
      },

      getAngleConfig(intersection) {
        const pseudoStates = ['transparent-but-related', 'default'];

        if (intersection.first.state === 'default' && intersection.second.state === 'default') {
          return this.calculateAngleConfig(intersection.first.points, intersection.second.points);
        } else if (pseudoStates.includes(intersection.first.state) && pseudoStates.includes(intersection.second.state)) {
          const visibleNodes = this.annotations.filter(ann => ann.state === 'default' && ann.geometryType === 'node');
          const visibleShapes = this.annotations.filter(ann => ann.state === 'default' && ann.geometryType === 'shape');

          let pseudoLine = [[0, 0], [0, 0]];
          if (visibleNodes.length == 1) {
            const node = visibleNodes[0];
            pseudoLine = [[intersection.x, intersection.y], [node.points[0][0], node.points[0][1]]];
          } else if (visibleShapes.length == 1) {
            const centroid = calculatePolygonCentroid(visibleShapes[0].points);
            pseudoLine = [[intersection.x, intersection.y], [centroid.x, centroid.y]];
          }

          let mainLine = intersection.first.points;
          if (intersection.second.state === 'default') {
            mainLine = intersection.second.points;
          }

          return this.calculateAngleConfig(pseudoLine, mainLine);
        } else {
          return {};
        }
      },

      getPseudoLineConfig(intersection) {
        if (intersection.first.state === 'transparent' || intersection.second.state === 'transparent') return {};

        const visibleNodes = this.annotations.filter(ann => ann.state === 'default' && ann.geometryType === 'node');
        const visibleShapes = this.annotations.filter(ann => ann.state === 'default' && ann.geometryType === 'shape');

        let pseudoLine = [0, 0, 0, 0];
        if (visibleNodes.length == 1) {
          const node = visibleNodes[0];
          pseudoLine = [intersection.x, intersection.y, node.points[0][0], node.points[0][1]];
        } else if (visibleShapes.length == 1) {
          const centroid = calculatePolygonCentroid(visibleShapes[0].points);
          pseudoLine = [intersection.x, intersection.y, centroid.x, centroid.y];
        }

        return {stroke: 'black', strokeWidth: 3, dash: [11, 4], points: pseudoLine}
      },

      getAnnotationsOfType(type) {
        let anns = [];
        for (let i = 0; i < this.annotations.length; i++) {
          if (this.annotations[i].geometryType === type) { 
            anns.push(this.annotations[i]);
          }
        }
        return anns;
      },

      pushAnnotation(geometryType, points) {
        const count = this.annotations.filter(a => a.geometryType == geometryType).length + 1;

        let annotation = {
          name: geometryType + count,
          geometryType: geometryType,
          points: points,
          state: 'default',
          category: null,
          subcategory: null,
          tags: [],
          relations: {},
        }

        let anns = this.annotations;
        if (geometryType === 'shape') {
          let previous = anns[anns.length - 1];
          if (previous && previous.geometryType === 'shape' && !previous.completed) {
            if (points.length == 0) {
              // If the shape has been subtracted away into nothing, then remove the annotation
              anns.pop();
            } else {
              // Update the existing, non-completed shape with the current points
              anns[anns.length - 1].history.push(points);
              anns[anns.length - 1].points = points;
            }
          } else {
            annotation['history'] = [points];
            anns.push(annotation);
          }
        } else {
          anns.push(annotation);
        }
        this.$emit('annotationsChange', anns);
      },

      withinClickThreshold(point1, point2) {
        return ((point1[0] - point2[0] < 6 && point1[0] - point2[0] > -6) 
              && (point1[1] - point2[1] < 6 && point1[1] - point2[1] > -6));
      },

      clip(newShapePoints) {
        let shape = [];
        let activeShape = this.annotations[this.annotations.length - 1];

        if (activeShape && activeShape.geometryType == 'shape' && !activeShape.completed) {
          let mode = this.drawingState.substring(0, 3);
          let results = clipPolygons(activeShape.points, newShapePoints, mode);
          if (results.warn) {
            this.$emit('warn', 'All subshapes should cross at a boundary. To create a new shape, complete the current one by clicking done.');
          }
          shape = results.points;
        } else {
          shape = newShapePoints[0];
        }

        this.pushAnnotation('shape', shape);
      },

      mousedown() {
        const pos = this.$refs.stage.getStage().getPointerPosition();
        if (this.programStage != 2 || !pos) return;

        if (this.drawingState.endsWith('polygon')) {
          this.activeLine = [[pos.x, pos.y]];
          this.activePolygon.push([pos.x, pos.y]);
          this.activeJoints.push({
            fill: this.activePolygon.length == 1 ? 'red' : 'orange', 
            radius: 4, x: pos.x, y: pos.y
          });
          
          if (this.activePolygon.length > 1) {
            let firstX = this.activePolygon[0][0];
            let firstY = this.activePolygon[0][1];

            // Closes the shape if the user clicks on the first point in the shape
            if (this.withinClickThreshold([firstX, firstY], [pos.x, pos.y])) {
              this.activePolygon.push([firstX, firstY]);
              this.clip([this.activePolygon]);
              this.resetActiveVariables();
            }
          }
        } else if (this.drawingState.endsWith('circle')) {
          if (this.activeCircle.length == 0) {
            this.activeCircle = [[pos.x, pos.y]];
          }
        } else if (this.drawingState.endsWith('rectangle')) {
          if (this.activeRectangle.length == 0) {
            this.activeRectangle = [[pos.x, pos.y]];
          }
        } else if (this.drawingState === 'linestring') {
          if (this.activeLine.length == 0) {
            this.activeLine = [[pos.x, pos.y]];
          }
        } else if (this.drawingState === 'node') {
          this.pushAnnotation('node', [[pos.x, pos.y]]);
          this.resetActiveVariables();
        }
      },

      // Draws a temporary line and corresponding intersections/joints as the user moves their mouse
      mousemove() {
        if (this.programStage != 2) return;
        if (this.activeLine.length == 0 && this.activeCircle.length == 0 && this.activeRectangle.length == 0) return;

        const pos = this.$refs.stage.getStage().getPointerPosition();
        if (pos) {
          this.activeLine[1] = [pos.x, pos.y];

          if (this.drawingState === 'linestring') {
            // Dynamically calculate any intersections with the current line
            const line1 = this.activeLine;
            this.activeIntersections = [];
            for (let i = 0; i < this.annotations.length; i++) {
              if (this.annotations[i].geometryType != 'linestring') continue;

              let line2 = this.annotations[i].points;
              let intersection = calculateIntersection(line1, line2);
              if (intersection && intersection.intersects) {
                this.activeIntersections.push({
                  fill: 'red', stroke: 'orange',
                  radius: 6, strokeWidth: 2,
                  x: intersection.x, y: intersection.y
                });
              }
            }
          } else if (this.drawingState.endsWith('polygon')) {
            if (this.activePolygon.length == 0) return;

            let firstX = this.activePolygon[0][0];
            let firstY = this.activePolygon[0][1];
            let hoveringOverJoint0 = this.withinClickThreshold([pos.x, pos.y], [firstX, firstY]);

            this.activeJoints = [];
            for (let i = 0; i < this.activePolygon.length; i++) {
              this.activeJoints.push({
                fill: i == 0 ? 'red' : 'orange', 
                radius: 4,
                stroke: (hoveringOverJoint0 && i == 0) ? 'yellow' : null,
                strokeWidth: (hoveringOverJoint0 && i == 0) ? 2 : null,
                x: this.activePolygon[i][0], y: this.activePolygon[i][1]
              });
            }
          } else if (this.drawingState.endsWith('circle')) {
            if (this.activeCircle.length == 0) return;
            this.activeCircle[1] = [pos.x, pos.y];
          } else if (this.drawingState.endsWith('rectangle')) {
            if (this.activeRectangle.length == 0) return;
            this.activeRectangle[1] = [pos.x, pos.y];
          }
        }
      },

      // Handles click and drag for creating linestrings
      mouseup() {
        if (this.programStage != 2) return;
        if (this.activeLine.length == 0  && this.activeCircle.length == 0 && this.activeRectangle == 0) return;

        const pos = this.$refs.stage.getStage().getPointerPosition();
        if (pos) {
          if (this.drawingState === 'linestring') {
            let firstX = this.activeLine[0][0];
            let firstY = this.activeLine[0][1];

            // Ignores small, accidental mouse movements
            if (this.withinClickThreshold([firstX, firstY], [pos.x, pos.y])) {
              this.activeLine = [];
              return;
            }

            this.pushAnnotation('linestring', this.activeLine);
            this.resetActiveVariables();
          } else if (this.drawingState.endsWith('rectangle')) {
            let firstX = this.activeRectangle[0][0];
            let firstY = this.activeRectangle[0][1];

            let rect = [[firstX, firstY], [firstX, pos.y], [pos.x, pos.y], [pos.x, firstY], [firstX, firstY]];

            if (this.withinClickThreshold([firstX, firstY], [pos.x, pos.y])) {
              this.activeRectangle = [];
              return;
            }

            this.clip([rect]);
            this.resetActiveVariables();
          } else if (this.drawingState.endsWith('circle')) {
            let centerX = this.activeCircle[0][0];
            let centerY = this.activeCircle[0][1];

            if (this.withinClickThreshold([centerX, centerY], [pos.x, pos.y])) {
              this.activeCircle = [];
              return;
            }

            // Splits the circle into discrete line segments
            let circle = [];
            let radius = getLineLength(pos.x, pos.y, centerX, centerY)
            let numPoints = Math.ceil(2 * Math.PI * radius / 10);
            let step = 2 * Math.PI / numPoints;
            for (let a = 0, i = 0; i < numPoints; i++, a += step)
            {
              let x = centerX + radius * Math.cos(a);
              let y = centerY + radius * Math.sin(a);
              circle.push([x, y]);
            }
            circle.push(circle[0]); // completes the loop

            this.clip([circle]);
            this.resetActiveVariables();
          }
        }

        let tracker = 0;
        let offset = 0;

        // Animates the outline of all "active" shapes
        this.anim.stop();
        this.anim = new Konva.Animation((frame) => {
          if (frame.time - tracker > 200) {
            offset = offset == 0 ? 15 : 0;
            let shapes = this.$refs.shapes;
            for (let i = 0; shapes && i < shapes.length; i++) {
              shapes[i].getNode().setAttr('dashOffset', offset);
            }
            tracker = frame.time;
          }
        }, this.$refs.layer.getStage());
        this.anim.start();
      },
      
      resize() {
        const canvas = document.querySelector('#canvas-section');
        if (!canvas) 
          return {};

        const previousWidth = this.stageConfig.width;
        const previousHeight = this.stageConfig.height;
        this.stageConfig.width = canvas.offsetWidth;
        this.stageConfig.height = canvas.offsetHeight;

        // Repositions each annotation's point(s) with respect to
        // the vertical and horizontal displacement of the resize. 
        const widthDisp = (this.stageConfig.width - previousWidth) / 2;
        const heightDisp = (this.stageConfig.height - previousHeight) / 2;

        for (let i = 0; i < this.annotations.length; i++) {
          let points = this.annotations[i].points;
          for (let j = 0; j < points.length; j++) {
            points[j][0] += widthDisp;
            points[j][1] += heightDisp;
          }
          this.annotations[i].points = points;
        }
      },
    },
  };
</script>

<template>
  <v-stage ref="stage" :config="stageConfig" @touchstart="mousedown" @touchend="mouseup" @touchmove="mousemove" 
      @mousemove="mousemove" @mousedown="mousedown" @mouseup="mouseup">
    <v-layer ref="layer">
      <v-image :config="imageConfig"/>
      <div v-if="programStage == 4">
        <v-line v-for="intersection in intersections" :config="getPseudoLineConfig(intersection)" __useStrictMode/>
        <v-shape v-for="intersection in intersections" :config="getAngleConfig(intersection)" __useStrictMode/>
      </div>
      <v-line v-for="line in getAnnotationsOfType('linestring')" :config="getLineConfig(line)"/>
      <v-line ref="shapes" v-for="shape in getAnnotationsOfType('shape')" :config="getShapeConfig(shape)"/>
      <v-circle v-for="node in getAnnotationsOfType('node')" :config="getNodeConfig(node)"/>
      <v-line v-if="activeLine.length == 2" :config="getActiveLineConfig(activeLine)"/>
      <v-line v-if="activeRectangle.length == 2" :config="getActiveRectangleConfig(activeRectangle)"/>
      <v-circle v-if="activeCircle.length == 2" :config="getActiveCircleConfig(activeCircle)"/>
      <v-line v-if="activePolygon.length > 1" :config="getActivePolygonConfig(activePolygon)"/>
      <v-circle v-for="intersection in intersections" :config="getIntersectionConfig(intersection)"/>
      <v-circle v-for="config in activeIntersections" :config="config"/>
      <v-circle v-for="config in activeJoints" :config="config"/>
    </v-layer>
  </v-stage>
</template>

<style scoped>

</style>
