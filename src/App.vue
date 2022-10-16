<script setup>
  import InteractiveCanvas from './components/InteractiveCanvas.vue'
  import InputBar from './components/InputBar.vue'
</script>

<script>
/**
programStage: int

annotations: [
  0:
    name: 'line0'
    geometryType: 'linestring'
    points
    genericType
    subtype
    tags: []
    relations: [
      [other_name]: {
        intersection
        max_distance
        min_distance
        angle
        error
      }
    ]
  
  1:
    name: 'node0'
    geometryType: 'circle'
    point
    genericType
    subtype
    tags: []
    relations: [
      [other_name]: {
        max_distance
        min_distance
      }
    }
  
  ...
]

// Contains index values of annotations that have been hidden for various reasons.
// Used by DrawBar to undo elements. Used by PropertiesBar and RelationBar to
// selectively hide certain elements during data entry.
hiddenAnnotations: []  

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
        hiddenAnnotations: [],
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
      hiddenAnnotationsChange(hiddenAnnotations) {
        this.hiddenAnnotations = hiddenAnnotations;
      }
    },
  }
</script>

<template>
  <header>
    <p>OSM Finder</p>
  </header>

  <section id="canvas-section">
    <InteractiveCanvas @annotationsChange="annotationsChange" @drawingStateChange="drawingStateChange"
      :programStage="programStage" :annotations="annotations" :hiddenAnnotations="hiddenAnnotations" :drawingState="drawingState" :image="image"/>
  </section>

  <section id="input-section">
    <InputBar @upload="upload" @programStageChange="programStageChange" @drawingStateChange="drawingStateChange" @hiddenAnnotationsChange="hiddenAnnotationsChange"
      :programStage="programStage" :annotations="annotations" :hiddenAnnotations="hiddenAnnotations" :drawingState="drawingState"/>
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
