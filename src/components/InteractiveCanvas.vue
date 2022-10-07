<script>
  import {calculateImageConfig} from '../assets/tools.js'

  const width = window.innerWidth;
  const height = window.innerHeight;

  export default {
    props: ['image', 'stage'],
    data() {
      return {
        stageConfig: {
          width: width,
          height: height
        },
        linestrings: [],                  // Array of arrays containing X and Y pairs for all lines already drawn
        activeLinestring: [],             // Starting and ending point for line currently being drawn
        drawingLinestring: false,         // False if no line is being drawn, true otherwise
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
        if (this.stage != 2) return;

        this.drawingLinestring = true;
        const pos = this.$refs.stage.getStage().getPointerPosition();
        if (pos) {
          this.activeLinestring = [pos.x, pos.y];
        }
      },

      mousemove() {
        if (!this.drawingLinestring || this.stage != 2) return;

        const pos = this.$refs.stage.getStage().getPointerPosition();
        if (pos) {
          this.activeLinestring.splice(2, 2, pos.x, pos.y);
        }
      },

      mouseup_mouseleave() {
        if (!this.drawingLinestring || this.stage != 2) return;

        this.linestrings.push(this.activeLinestring);
        this.drawingLinestring = false;
        this.activeLinestring = [];
      },
    }
  };
</script>

<template>
  <v-stage ref="stage" :config="stageConfig" @mousemove="mousemove" @mousedown="mousedown" @mouseup="mouseup_mouseleave" @mouseleave="mouseup_mouseleave">
    <v-layer ref="layer">
      <v-image :config="imageConfig"/>
      <v-line v-for="line in linestrings" :config="getLineConfig(line)"/>
      <v-line v-if="drawingLinestring" :config="getLineConfig(activeLinestring)"/>
    </v-layer>
  </v-stage>
</template>

<style scoped>

</style>
