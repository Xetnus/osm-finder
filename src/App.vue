<script setup>
  import InteractiveCanvas from './components/InteractiveCanvas.vue'
  import InputBar from './components/InputBar.vue'
  import QueryPage from './components/QueryPage.vue'
</script>

<script>
// Overview of global variables:
/**
programStage: int

annotations: [
  0:
    name: 'line1'
    geometryType: 'linestring'
    points
    state // either transparent, support, or normal
    genericType
    subtype
    tags: []
    relations: {
      name: {
        maxDistance
        minDistance
        angle
        error
      }
    }
  
  1:
    name: 'node1'
    geometryType: 'node'
    point
    state // either transparent, support, or normal
    genericType
    subtype
    tags: []
    relations: {
      name: {
        maxDistance
        minDistance
        angle
        error
      }
    }
  
  ...
]

drawingState: {
  drawingLinestring: boolean
  drawingNode: boolean
}
 */

  import defaultImage from './assets/Massachusetts turnpike.jpg';
  export default {
    data() {
      return {
        image: null,        // Currently rendered image in the canvas
        programStage: 1,    // Stage of the program (upload, drawing, details, etc.)
        annotations: [],    // Data of the drawn annotations (e.g., lines, nodes)
        drawingState: {     // Keeps the active state of the user's drawing input
          drawingLinestring: false,
          drawingNode: false,
        },
      }
    },
    created() {
      // Load default image at start
      const img = new Image();
      img.src = defaultImage;
      img.onload = () => {
        this.image = img;
      };
    },
    methods: {
      upload() {
        // Lets the user upload their own photo
        let input = document.createElement('input');
        input.type = 'file';

        input.onchange = (e) => {
          let file = e.target.files[0]; 
          let reader = new FileReader();
          reader.readAsDataURL(file);

          reader.onload = (readerEvent) => {
              let content = readerEvent.target.result;

              let img = new Image;
              img.src = content;

              img.onload = () => {
                this.image = img;
                this.annotations = [];
              }
          }
        }
        input.click();
      },
      programStageChange(programStage) {
        this.programStage = programStage;
      },
      drawingStateChange(drawingState) {
        this.drawingState = drawingState;
      },
      annotationsChange(annotations) {
        this.annotations = annotations;
      },
    },
  }
</script>

<template>
  <header>
    <p>OSM Finder</p>
  </header>

  <section id="canvas-section">
    <InteractiveCanvas @annotationsChange="annotationsChange" @drawingStateChange="drawingStateChange"
      :programStage="programStage" :annotations="annotations" :drawingState="drawingState" :image="image"/>
  </section>

  <section id="input-section">
    <InputBar @upload="upload" @programStageChange="programStageChange" @drawingStateChange="drawingStateChange" @annotationsChange="annotationsChange" 
      :programStage="programStage" :annotations="annotations" :drawingState="drawingState"/>
  </section>

  <QueryPage v-if="programStage == 5" @programStageChange="programStageChange" :programStage="programStage" :annotations="annotations"/>
</template>

<style scoped>
  header {
    user-select: none;
    -webkit-user-select: none;
    position: absolute;
    left: 0;
    right: 0;
    width: 10em;
    font-size: 16px;
    margin: auto;
    z-index: 1;
    background-color: grey;
    text-align: center;
  }

  #canvas-section {
    background-color: lightsteelblue;
    height: calc(100% - 155px);
    width: 100%;
  }

  #input-section {
    background-color: grey;
    height: 155px;
    width: 100%;
  }
</style>
