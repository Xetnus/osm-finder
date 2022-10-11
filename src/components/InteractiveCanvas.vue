<script>
  import {calculateImageConfig} from '../assets/tools.js'

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
        drawnLinestrings: [],             // Array of arrays containing X and Y pairs for all lines already drawn
        activeLinestring: [],             // Starting and ending point for line currently being drawn
        activeIntersection: [],
        activelyDrawing: false,           // False if no line is being drawn, true otherwise
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
    },
    methods: {
      getLineConfig(points) {
        return {stroke: 'black', strokeWidth: 5, points: Object.assign([], points)}
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
        }
      },

      mouseup_mouseleave() {
        if (!this.activelyDrawing || this.programStage != 2) return;

        this.drawnLinestrings.push(this.activeLinestring);

        const line = {
          'points': this.activeLinestring,
          'genericType': null,
          'subtype': null,
          'tags': []
        }
        // Lets the component know we aren't drawing anymore
        this.activelyDrawing = false;
        this.activeLinestring = [];

        // Lets the program know we aren't drawing anymore
        let state = this.drawingState;
        state.drawingLinestring = false;
        this.$emit('drawingStateChange', state);
        this.$emit('linestringsChange');
      },
    }
  };
</script>

<template>
  <v-stage ref="stage" :config="stageConfig" @touchstart="mousedown" @touchend="mouseup_mouseleave" @touchmove="mousemove" @mousemove="mousemove" @mousedown="mousedown" @mouseup="mouseup_mouseleave" @mouseleave="mouseup_mouseleave">
    <v-layer ref="layer">
      <v-image :config="imageConfig"/>
      <v-line v-for="line in drawnLinestrings" :config="getLineConfig(line)"/>
      <v-line v-if="activelyDrawing" :config="getLineConfig(activeLinestring)"/>
    </v-layer>
  </v-stage>
</template>

<style scoped>

</style>
