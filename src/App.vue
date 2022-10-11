<script setup>
  import InteractiveCanvas from './components/InteractiveCanvas.vue'
  import InputBar from './components/InputBar.vue'
</script>

<script>
/**
programStage: 

linestrings: [
  0:
    points
    genericType
    subtype
    tags: []
    [other id]:
      max_distance
      min_distance
      angle
      error
]

nodes: [
  0:
    point
    genericType
    subtype
    tags: []
    [other id]:
      max_distance
      min_distance
]
    
drawingState: {
  drawingLinestring: boolean
  drawingNode: boolean
  undo: boolean
  redo: boolean
  cancel: boolean
}
 */

  import defaultImage from './assets/Massachusetts turnpike.jpg';
  export default {
    data() {
      return {
        image: null,        // Currently rendered image in the canvas
        programStage: 1,    // Stage of the program (upload, drawing, descriptions, etc.)
        linestrings: [],    // Data of the drawn linestrings
        nodes: [],          // Data of the drawn nodes
        drawingState: {     // Keeps the active state of the user's drawing input
          drawingLinestring: false,
          drawingNode: false,
          undo: false,
          redo: false,
          cancel: false
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
        var input = document.createElement('input');
        input.type = 'file';

        input.onchange = (e) => {
          var file = e.target.files[0]; 
          var reader = new FileReader();
          reader.readAsDataURL(file);

          reader.onload = (readerEvent) => {
              var content = readerEvent.target.result;

              var img = new Image;
              img.src = content;

              img.onload = () => {
                this.image = img;
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
      linestringsChange(linestring) {
        this.linestrings = linestring;
      },
      nodesChange(node) {
        // TODO
      }
    },
  }
</script>

<template>
  <header>
    <p>OSM Finder</p>
  </header>

  <section id="canvas-section">
    <InteractiveCanvas @linestringsChange="linestringsChange" @nodesChange="nodesChange" @drawingStateChange="drawingStateChange"
      :programStage="programStage" :linestrings="linestrings" :nodes="nodes" :drawingState="drawingState" :image="image"/>
  </section>

  <section id="input-section">
    <InputBar @upload="upload" @programStageChange="programStageChange" @drawingStateChange="drawingStateChange" 
      :programStage="programStage" :linestrings="linestrings" :nodes="nodes" :drawingState="drawingState"/>
  </section>
</template>

<style scoped>
  header {
    position: absolute;
    left: 0;
    right: 0;
    width: 10em;
    margin: auto;
    z-index: 1;
    background-color: grey;
  }

  #canvas-section {
    background-color: lightsteelblue;
    height: 80%;
    width: 100%;
  }

  #input-section {
    background-color: grey;
    height: 20%;
    width: 100%;
  }
</style>
