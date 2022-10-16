<script>
  import {calculateImageConfig, calculateIntersection} from '../assets/tools.js'

  const width = window.innerWidth;
  const height = window.innerHeight;

  export default {
    props: ['image', 'programStage', 'linestrings', 'nodes', 'drawingState'],
    emits: ['linestringsChange', 'nodesChange', 'drawingStateChange'],
    data() {
      return {
        stageConfig: {
          width: width,
          height: height
        },
        drawnLinestrings: [],             // Array of arrays [[x1 y1 x2 y2]] for any permanent lines already drawn
        activeLinestring: [],             // Starting and ending point for line currently being drawn
        drawnIntersections: [],           // Array of arrays [[x y]] for any permanent intersections already drawn
        activeIntersections: [],          // Array of arrays [[x y]] for any intersections on the line being drawn
        activelyDrawing: false,           // False if no line is being drawn, true otherwise
      };
    },
    computed: {
      imageConfig() {
        this.image; // Forces the computed value to re-render when this.image changes

        const canvas = document.querySelector('#canvas-section');
        if (!canvas || !this.image) 
          return {};

        this.drawnLinestrings = [];
        this.drawnIntersections = [];

        // width and height variables don't line up with the true canvas dimensions,
        // so we recalculate them 
        this.stageConfig.width = canvas.offsetWidth;
        this.stageConfig.height = canvas.offsetHeight;
        return calculateImageConfig(this.image, this.stageConfig.width, this.stageConfig.height);
      },
    },
    methods: {
      getLineConfig(points, active) {
        // If the user cancels the linestring drawing operation, reset active variables
        if (active && !this.drawingState.drawingLinestring) {
          this.activeLinestring = [];
          this.activeIntersections = [];
          this.activelyDrawing = false;

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

        this.activelyDrawing = true;
        const pos = this.$refs.stage.getStage().getPointerPosition();
        if (pos) {
          this.activeLinestring = [pos.x, pos.y];
        }
      },

      mousemove() {
        if (!this.activelyDrawing || this.programStage != 2) return;

        const pos = this.$refs.stage.getStage().getPointerPosition();
        if (pos) {
          this.activeLinestring.splice(2, 2, pos.x, pos.y);
        
          // Dynamically calculate any intersections with the current line
          const line1 = this.activeLinestring;
          this.activeIntersections = [];
          for (var i = 0; i < this.drawnLinestrings.length; i++) {
            let line2 = this.drawnLinestrings[i];
            let intersection = calculateIntersection(line1[0], line1[1], line1[2], line1[3], line2[0], line2[1], line2[2], line2[3]);
            if (intersection && intersection.seg1 && intersection.seg2) {
              this.activeIntersections.push([intersection.x, intersection.y]);
            }
          }
        }
      },

      mouseup_mouseleave() {
        if (!this.activelyDrawing || this.programStage != 2) return;

        this.drawnLinestrings.push(this.activeLinestring);
        this.drawnIntersections = this.drawnIntersections.concat(this.activeIntersections);
        this.activeIntersections = [];

        // Lets the component know we aren't drawing anymore
        this.activelyDrawing = false;
        this.activeLinestring = [];

        // Lets the program know we aren't drawing anymore
        let state = this.drawingState;
        state.drawingLinestring = false;
        this.$emit('drawingStateChange', state);

        let linestrings = this.linestrings;
        linestrings.push({
          points: this.activeLinestring,
          genericType: null,
          subtype: null,
          tags: [],
        });
        this.$emit('linestringsChange', linestrings);
      },
    }
  };
</script>

<template>
  <v-stage ref="stage" :config="stageConfig" @touchstart="mousedown" @touchend="mouseup_mouseleave" @touchmove="mousemove" 
      @mousemove="mousemove" @mousedown="mousedown" @mouseup="mouseup_mouseleave" @mouseleave="mouseup_mouseleave">
    <v-layer ref="layer">
      <v-image :config="imageConfig"/>
      <v-line v-for="line in drawnLinestrings" :config="getLineConfig(line, false)"/>
      <v-line v-if="activelyDrawing" :config="getLineConfig(activeLinestring, true)"/>
      <v-circle v-for="circle in drawnIntersections" :config="getIntersectionConfig(circle, false)"/>
      <v-circle v-for="circle in activeIntersections" :config="getIntersectionConfig(circle, true)"/>
    </v-layer>
  </v-stage>
</template>

<style scoped>

</style>
