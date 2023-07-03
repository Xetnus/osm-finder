<script>
import {calculateIntersection, getLineLength, getPointAtDistance, debounce, getUniquePairs} from '../assets/generalTools.js'

  export default {
    props: ['image', 'programStage', 'annotations', 'drawingState'],
    emits: ['annotationsChange', 'drawingStateChange'],
    data() {
      return {
        stageConfig: {
          width: null,
          height: null,
        },
        activeLine: [],                  // [x1, y1, x2, y2] for line currently being drawn
        activeShape: [],                 // [[x1 y1], [x2 y2], ...] for shape currently being drawn
        activeIntersections: [],         // Array of arrays for any intersections on the line being drawn
        activeJoints: [],                // Array of arrays for any joints that connect lines of a shape
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
      // Lets the program know we aren't drawing anymore
      emitStopDrawing() {
        // Resets temporary variables
        this.activeShape = [];
        this.activeLine = [];
        this.activeIntersections = [];
        this.activeJoints = [];

        let state = this.drawingState;
        state = false;
        this.$emit('drawingStateChange', state);
      },

      getLineConfig(line) {
        let opacity =  1;
        let shadowEnabled = true;
        
        if (line.state === 'transparent' || line.state === 'transparent-but-related') {
          opacity = 0.3;
          shadowEnabled = false;
        }

        return {stroke: 'black', strokeWidth: 5, points: Object.assign([], line.points), opacity: opacity, 
                shadowEnabled: shadowEnabled, shadowBlur: 3, shadowColor: 'cyan'}
      },

      getShapeConfig(shape) {
        return {closed: true, stroke: 'black', fill: 'blue', opacity: 0.7, strokeWidth: 5, points: shape.points.flat(1)}
      },

      getNodeConfig(node) {
        const opacity = node.state === 'transparent' ? 0.2 : 1;
        return {fill: 'midnightblue', stroke: 'lightblue', radius: 10, strokeWidth: 3,
                x: node.points[0][0], y: node.points[0][1], opacity: opacity}
      },

      getActiveLineConfig(points) {
        // If the user cancels the linestring drawing operation, reset active variables
        if (this.drawingState === false) {
          this.activeLine = [];
          this.activeIntersections = [];
          return {};
        }

        return {stroke: 'black', strokeWidth: 5, points: Object.assign([], points)}
      },

      getActiveShapeConfig(index) {
        if (this.activeShape.length - 1 <= index) return {};

        let point1 = this.activeShape[index];
        let point2 = this.activeShape[index + 1];

        return {stroke: 'black', strokeWidth: 5, points: [point1[0], point1[1], point2[0], point2[1]]}
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
        const temp1_len1 = getLineLength(intersection.x, intersection.y, line1[0], line1[1]);
        const temp2_len1 = getLineLength(intersection.x, intersection.y, line1[2], line1[3]);
        let line1_x = 2; 
        let line1_y = 3;
        let len1 = temp2_len1;

        if (temp1_len1 > temp2_len1) {
          line1_x = 0;
          line1_y = 1;
          len1 = temp1_len1;
        }

        // Finds the longest segment of line2, assuming the line is split at the intersection
        const temp1_len2 = getLineLength(intersection.x, intersection.y, line2[0], line2[1]);
        const temp2_len2 = getLineLength(intersection.x, intersection.y, line2[2], line2[3]);
        let line2_x = 2; 
        let line2_y = 3;
        let len2 = temp2_len2;

        if (temp1_len2 > temp2_len2) {
          line2_x = 0;
          line2_y = 1;
          len2 = temp1_len2;
        }

        // Determines the shortest segment between each line's longest segment
        const minLen = len1 > len2 ? len2 : len1;

        // Determines where the angle path intersects the lines
        const point1 = [intersection.x, intersection.y];
        const line1d = getPointAtDistance(point1, [line1[line1_x], line1[line1_y]], minLen / 3);
        const line2d = getPointAtDistance(point1, [line2[line2_x], line2[line2_y]], minLen / 3);

        // Determines the 'height' of the angle path
        const line1_control = getPointAtDistance(point1, [line1[line1_x], line1[line1_y]], minLen / 2);
        const line2_control = getPointAtDistance(point1, [line2[line2_x], line2[line2_y]], minLen / 2);
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
          if (visibleNodes.length != 1) return {};
          const node = visibleNodes[0];

          let mainLine = intersection.first.points;
          if (intersection.second.state === 'default') {
            mainLine = intersection.second.points;
          }

          const pseudoLine = [intersection.x, intersection.y, node.point[0], node.point[1]];
          return this.calculateAngleConfig(pseudoLine, mainLine);
        } else {
          return {};
        }
      },

      getPseudoLineConfig(intersection) {
        if (intersection.first.state === 'transparent' || intersection.second.state === 'transparent') return {};

        const visibleNodes = this.annotations.filter(ann => ann.state === 'default' && ann.geometryType === 'node');
        if (visibleNodes.length != 1) return {};
        const node = visibleNodes[0];

        const pseudoLine = [intersection.x, intersection.y, node.point[0], node.point[1]];
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

        let annotations = this.annotations;
        annotations.push({
          name: geometryType + count,
          geometryType: geometryType,
          points: points,
          state: 'default',
          category: null,
          subcategory: null,
          tags: [],
          relations: {},
        });
        this.$emit('annotationsChange', annotations);
      },

      withinClickThreshold(point1, point2) {
        return ((point1[0] - point2[0] < 4 && point1[0] - point2[0] > -4) 
              && (point1[1] - point2[1] < 4 && point1[1] - point2[1] > -4));
      },

      mousedown() {
        const pos = this.$refs.stage.getStage().getPointerPosition();
        if (this.programStage != 2 || !pos) return;

        if (this.drawingState === 'linestring') {
          if (this.activeLine.length > 0) {
            this.activeLine.splice(2, 2, pos.x, pos.y);
            this.pushAnnotation('linestring', this.activeLine);
            this.emitStopDrawing();
          } else {
            this.activeLine = [pos.x, pos.y];
          }
        } else if (this.drawingState === 'shapeLine') {
          if (this.activeShape.length > 1) {
            let firstX = this.activeShape[0][0];
            let firstY = this.activeShape[0][1];

            // Closes the shape if the user clicks on the first point in the shape
            if (this.withinClickThreshold([firstX, firstY], [pos.x, pos.y])) {
              this.activeShape.push([firstX, firstY]);
              this.pushAnnotation('shape', this.activeShape);
              this.emitStopDrawing();
            } else {
              this.activeLine = [pos.x, pos.y];
              this.activeShape.push([pos.x, pos.y]);
            }
          } else {
            this.activeLine = [pos.x, pos.y];
            this.activeShape.push([pos.x, pos.y]);
          }

        } else if (this.drawingState === 'node') {
          this.pushAnnotation('node', [[pos.x, pos.y]]);
          this.emitStopDrawing();
        }
      },

      // Draws a temporary line and corresponding intersections/joints as the user moves their mouse
      mousemove() {
        if (this.programStage != 2 || this.activeLine.length == 0) return;

        const pos = this.$refs.stage.getStage().getPointerPosition();
        if (pos) {
          this.activeLine.splice(2, 2, pos.x, pos.y);

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
          } else if (this.drawingState === 'shapeLine') {
            if (this.activeShape.length == 0) return;

            let firstX = this.activeShape[0][0];
            let firstY = this.activeShape[0][1];
            let hoveringOverJoint0 = this.withinClickThreshold([pos.x, pos.y], [firstX, firstY]);

            this.activeJoints = [];

            for (let i = 0; i < this.activeShape.length; i++) {
              this.activeJoints.push({
                fill: i == 0 ? 'red' : 'orange', 
                radius: 4,
                stroke: (hoveringOverJoint0 && i == 0) ? 'yellow' : null,
                strokeWidth: (hoveringOverJoint0 && i == 0) ? 2 : null,
                x: this.activeShape[i][0], y: this.activeShape[i][1]
              });
            }
          }
        }
      },

      // Handles click and drag for creating linestrings
      mouseup() {
        if (this.programStage != 2 || this.activeLine.length == 0) return;
        if (this.drawingState === 'shapeLine') return;

        const pos = this.$refs.stage.getStage().getPointerPosition();
        if (pos) {
          let firstX = this.activeLine[0];
          let firstY = this.activeLine[1];
          // Ignores small, accidental mouse movements
          if (!this.withinClickThreshold([firstX, firstY], [pos.x, pos.y])) {
            this.pushAnnotation('linestring', this.activeLine);
            this.emitStopDrawing();
          }
        }
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
          if (this.annotations[i].geometryType == 'linestring') {
            let points = this.annotations[i].points;
            points[0] = points[0] + widthDisp;
            points[1] = points[1] + heightDisp;
            points[2] = points[2] + widthDisp;
            points[3] = points[3] + heightDisp;
            this.annotations[i].points = points;
          } else if (this.annotations[i].geometryType == 'node') {
            let point = this.annotations[i].point;
            point[0] = point[0] + widthDisp;
            point[1] = point[1] + heightDisp;
            this.annotations[i].point = point;
          }
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
      <v-line v-for="shape in getAnnotationsOfType('shape')" :config="getShapeConfig(shape)"/>
      <v-circle v-for="node in getAnnotationsOfType('node')" :config="getNodeConfig(node)"/>
      <v-line v-if="activeLine.length == 4" :config="getActiveLineConfig(activeLine)"/>
      <v-line v-for="index in activeShape.length" :key="index" :config="getActiveShapeConfig(index - 1)"/>
      <v-circle v-for="intersection in intersections" :config="getIntersectionConfig(intersection)"/>
      <v-circle v-for="config in activeIntersections" :config="config"/>
      <v-circle v-for="config in activeJoints" :config="config"/>
    </v-layer>
  </v-stage>
</template>

<style scoped>

</style>
