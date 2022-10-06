<script>
  const width = window.innerWidth;
  const height = window.innerHeight;

  export default {
    data() {
      return {
        stageConfig: {
          width: width,
          height: height
        },
        linestrings: [],
        activeLinestring: [],
        drawingLinestring: false,
        image: null
      };
    },
    created() {
      const image = new window.Image();
      const backgroundImage = new URL('./Massachusetts turnpike.jpg', import.meta.url).href
      image.src = backgroundImage;
      image.onload = () => {
        // width and height variables don't line up with the true canvas dimensions,
        // so we recalculate them 
        this.stageConfig.width = document.querySelector('#canvas-section').offsetWidth;
        this.stageConfig.height = document.querySelector('#canvas-section').offsetHeight;

        this.image = image;

        const widthRatio = (this.stageConfig.width - 50) / image.width;
        const heightRatio = (this.stageConfig.height - 50) / image.height;
        const scale = Math.min(widthRatio, heightRatio);
        this.image.height = image.height * scale;
        this.image.width = image.width * scale;
      };
    },
    methods: {
      getLineConfig(points) {
        return {stroke: 'black', strokeWidth: 5, points: Object.assign([], points)}
      },

      mousedown() {
        this.drawingLinestring = true;
        const pos = this.$refs.stage.getStage().getPointerPosition();
        if (pos) {
          this.activeLinestring = [pos.x, pos.y]
        }
      },

      mousemove() {
        if (!this.drawingLinestring)
          return

        const pos = this.$refs.stage.getStage().getPointerPosition();
        if (pos) {
          this.activeLinestring.splice(2, 2, pos.x, pos.y)
        }
      },

      mouseup_mouseleave() {
        if (!this.drawingLinestring)
          return

        this.linestrings.push(this.activeLinestring)
        this.drawingLinestring = false;
        this.activeLinestring = []
      },
    }
  };
</script>

<template>
  <v-stage ref="stage" :config="stageConfig" @mousemove="mousemove" @mousedown="mousedown" @mouseup="mouseup_mouseleave" @mouseleave="mouseup_mouseleave">
    <v-layer ref="layer">
      <v-image :config="{image: image}"/>
      <v-line v-for="line in linestrings" :config="getLineConfig(line)"/>
      <v-line v-if="drawingLinestring" :config="getLineConfig(activeLinestring)"/>
    </v-layer>
  </v-stage>
</template>

<style scoped>

</style>
