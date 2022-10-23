<script>
import {calculateImageConfig, calculateIntersection, getLineLength, getPointAtDistance} from '../assets/generalTools.js'

  const width = window.innerWidth;
  const height = window.innerHeight;

  export default {
    props: ['image', 'programStage', 'annotations', 'drawingState'],
    emits: ['annotationsChange', 'drawingStateChange'],
    data() {
      return {
        stageConfig: {
          width: width,
          height: height
        },
        activeLinestring: [],            // [x1 y1 x2 y2] for line currently being drawn
        activeIntersections: [],         // Array of arrays for any intersections on the line being drawn
        isMouseDown: false,              // False if no line is being drawn, true otherwise
      };
    },
    computed: {
      imageConfig() {
        this.image; // Forces the computed value to re-render when this.image changes

        const canvas = document.querySelector('#canvas-section');
        if (!canvas || !this.image) 
          return {};

        // width and height variables don't line up with the true canvas dimensions,
        // so we recalculate them 
        this.stageConfig.width = canvas.offsetWidth;
        this.stageConfig.height = canvas.offsetHeight;
        return calculateImageConfig(this.image, this.stageConfig.width, this.stageConfig.height);
      },

      linestrings() {
        let lines = [];
        for (let i = 0; i < this.annotations.length; i++) {
          if (this.annotations[i].geometryType != 'linestring') { 
            continue;
          }

          lines.push(this.annotations[i]);
        }
        return lines;
      },

      intersections() {
        let points = [];
        // Good old, trusty O(n^2)
        for (let i = 0; i < this.annotations.length; i++) {
          if (this.annotations[i].geometryType != 'linestring') { 
            continue;
          }
          for (let j = 0; j < this.annotations.length; j++) {
            if (i == j || this.annotations[j].geometryType != 'linestring') { 
              continue;
            }

            let line1 = this.annotations[i].points;
            let line2 = this.annotations[j].points;
            let intersection = calculateIntersection(line1[0], line1[1], line1[2], line1[3], line2[0], line2[1], line2[2], line2[3]);
            if (intersection && intersection.seg1 && intersection.seg2) {
              points.push([intersection.x, intersection.y]);
            }
          }
        }
        return points;
      }
    },
    methods: {
      getLineConfig(line) {
        let opacity = line.transparent ? 0.2 : 1;
        return {stroke: 'black', strokeWidth: 5, points: Object.assign([], line.points), opacity: opacity}
      },

      getActiveLineConfig(points) {
        // If the user cancels the linestring drawing operation, reset active variables
        if (!this.drawingState.drawingLinestring) {
          this.activeLinestring = [];
          this.activeIntersections = [];
          this.isMouseDown = false;

          return {};
        }

        return {stroke: 'black', strokeWidth: 5, points: Object.assign([], points)}
      },

      getIntersectionConfig(point, active) {
        const fill = active ? 'red' : 'orange';
        const stroke = active ? 'orange' : 'yellow';

        return {radius: 6, fill: fill, stroke: stroke, strokeWidth: 2, x: point[0], y: point[1]}
      },

      getAngleConfig() {
        const lines = this.annotations.filter(ann => !ann.transparent && ann.geometryType == 'linestring')
        if (lines.length != 2) return;

        const line1 = lines[0].points;
        const line2 = lines[1].points;
        let intersection = calculateIntersection(line1[0], line1[1], line1[2], line1[3], line2[0], line2[1], line2[2], line2[3]);
        if (intersection && intersection.seg1 && intersection.seg2) {
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
          const line1d = getPointAtDistance(intersection.x, intersection.y, line1[line1_x], line1[line1_y], minLen / 3);
          const line2d = getPointAtDistance(intersection.x, intersection.y, line2[line2_x], line2[line2_y], minLen / 3);

          // Determines the 'height' of the angle path
          const line1_control = getPointAtDistance(intersection.x, intersection.y, line1[line1_x], line1[line1_y], minLen / 2);
          const line2_control = getPointAtDistance(intersection.x, intersection.y, line2[line2_x], line2[line2_y], minLen / 2);
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
            }
          }

          // TODO: make this method work with multiple intersections
        }

        return {}
      },

      mousedown() {
        if (!this.drawingState.drawingLinestring || this.programStage != 2) return;

        this.isMouseDown = true;
        const pos = this.$refs.stage.getStage().getPointerPosition();
        if (pos) {
          this.activeLinestring = [pos.x, pos.y];
        }
      },

      mousemove() {
        if (!this.isMouseDown || this.programStage != 2) return;

        const pos = this.$refs.stage.getStage().getPointerPosition();
        if (pos) {
          this.activeLinestring.splice(2, 2, pos.x, pos.y);
        
          // Dynamically calculate any intersections with the current line
          const line1 = this.activeLinestring;
          this.activeIntersections = [];
          for (let i = 0; i < this.annotations.length; i++) {
            if (this.annotations[i].geometryType != 'linestring') continue;

            let line2 = this.annotations[i].points;
            let intersection = calculateIntersection(line1[0], line1[1], line1[2], line1[3], line2[0], line2[1], line2[2], line2[3]);
            if (intersection && intersection.seg1 && intersection.seg2) {
              this.activeIntersections.push([intersection.x, intersection.y]);
            }
          }
        }
      },

      mouseup_mouseleave() {
        if (!this.isMouseDown || this.programStage != 2) return;

        const count = this.annotations.filter(a => a.geometryType == 'linestring').length + 1;

        let annotations = this.annotations;
        annotations.push({
          name: 'line' + count,
          geometryType: 'linestring',
          points: this.activeLinestring,
          transparent: false,
          genericType: null,
          subtype: null,
          tags: [],
          relations: [],
        });
        this.$emit('annotationsChange', annotations);

        // Lets the component know we aren't drawing anymore
        this.isMouseDown = false;
        this.activeLinestring = [];
        this.activeIntersections = [];

        // Lets the program know we aren't drawing anymore
        let state = this.drawingState;
        state.drawingLinestring = false;
        this.$emit('drawingStateChange', state);
      },
    }
  };
</script>

<template>
  <v-stage ref="stage" :config="stageConfig" @touchstart="mousedown" @touchend="mouseup_mouseleave" @touchmove="mousemove" 
      @mousemove="mousemove" @mousedown="mousedown" @mouseup="mouseup_mouseleave" @mouseleave="mouseup_mouseleave">
    <v-layer ref="layer">
      <v-image :config="imageConfig"/>
      <v-line v-for="line in linestrings" :config="getLineConfig(line)"/>
      <v-line v-if="isMouseDown" :config="getActiveLineConfig(activeLinestring)"/>
      <v-circle v-for="circle in intersections" :config="getIntersectionConfig(circle, false)"/>
      <v-circle v-for="intersection in activeIntersections" :config="getIntersectionConfig(intersection, true)"/>
      <div v-if="programStage == 4">
        <v-shape :config="getAngleConfig()"/>
      </div>
    </v-layer>
  </v-stage>
</template>

<style scoped>

</style>
