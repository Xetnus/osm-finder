<script>
import {calculateImageConfig, calculateIntersection} from '../assets/interfaceTools.js'

  const width = window.innerWidth;
  const height = window.innerHeight;

  export default {
    props: ['image', 'programStage', 'annotations', 'hiddenAnnotations', 'drawingState'],
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
        var points = [];
        for (var i = 0; i < this.annotations.length; i++) {
          if (this.annotations[i].geometryType != 'linestring' || this.hiddenAnnotations.includes(i)) { 
            continue;
          }

          points.push(this.annotations[i].points);
        }
        return points;
      },

      intersections() {
        var points = [];
        // Good old, trusty O(n^2)
        for (var i = 0; i < this.annotations.length; i++) {
          if (this.annotations[i].geometryType != 'linestring' || this.hiddenAnnotations.includes(i)) { 
            continue;
          }
          for (var j = 0; j < this.annotations.length; j++) {
            if (i == j || this.annotations[j].geometryType != 'linestring' || this.hiddenAnnotations.includes(j)) { 
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
        return {stroke: 'black', strokeWidth: 5, points: Object.assign([], line)}
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
          for (var i = 0; i < this.annotations.length; i++) {
            if (this.hiddenAnnotations.includes(i) || this.annotations[i].geometryType != 'linestring') continue;

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

        const count = this.annotations.filter(a => a.geometryType == 'linestring').length;

        let annotations = this.annotations;
        annotations.push({
          name: 'line' + count,
          geometryType: 'linestring',
          points: this.activeLinestring,
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
    </v-layer>
  </v-stage>
</template>

<style scoped>

</style>
