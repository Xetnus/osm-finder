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
    state // either transparent, transparent-but-related, or default 
    category
    subcategory
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
    <same as other annotations>
  
  2:
    name: 'shape1'
    geometryType: 'shape'
    <same as other annotations>

  ...
]

drawingState: {
  drawingLinestring: boolean
  drawingNode: boolean
}
 */

  import defaultImage from './assets/Washington_US.jpg';
  export default {
    data() {
      return {
        image: null,        // Currently rendered image in the canvas
        programStage: 1,    // Stage of the program (upload, drawing, details, etc.)
        annotations: [],    // Data of the drawn annotations (e.g., lines, nodes)
        drawingState: 'none',     // Keeps the active state of the user's drawing input
        warningDisplayed: false,
        warningMessage: '',
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
      upload(file) {
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
      },
      programStageChange(programStage) {
        if (this.annotations.length == 1 && this.programStage == 5 && programStage < this.programStage) {
          this.programStage = 3;
        } else if (this.annotations.length == 1 && this.programStage == 3 && programStage > this.programStage){
          this.programStage = 5;
        } else {
          this.programStage = programStage;
        }
      },
      drawingStateChange(drawingState) {
        this.drawingState = drawingState;
      },
      annotationsChange(annotations) {
        this.annotations = annotations;
      },
      displayWarning(warning) {
        this.warningDisplayed = true;
        this.warningMessage = warning;
        setTimeout(() => {
          this.warningDisplayed = false;
          this.warningMessage = '';
        }, 5000);
      },
    },
  }
</script>

<template>
  <q-bar class="bg-dark">
    <q-badge class="q-mr-xl q-px-md" color="dark">
      <q-icon name="public" size="md"/>
      <div id="title" class="q-pl-sm">OSM Finder</div>
    </q-badge>

    <q-space />

    <q-btn square href="https://github.com/Xetnus/osm-finder" target="_blank" icon="code" size="md" color="secondary">
      <q-tooltip class="bg-secondary text-body2" :offset="[10, 10]" :delay="400">
        View source code
      </q-tooltip>
    </q-btn>

    <q-btn square href="https://github.com/Xetnus/osm-finder/wiki" target="_blank" icon="help" size="md" color="secondary">
      <q-tooltip class="bg-secondary text-body2" :offset="[10, 10]" :delay="400">
        View instructions
      </q-tooltip>
    </q-btn>
  </q-bar>

  <section id="canvas-section">
    <InteractiveCanvas @annotationsChange="annotationsChange" @drawingStateChange="drawingStateChange"
      :programStage="programStage" :annotations="annotations" :drawingState="drawingState" :image="image"/>
  </section>

  <section id="input-section">
    <InputBar @upload="upload" @programStageChange="programStageChange" @drawingStateChange="drawingStateChange"
      @annotationsChange="annotationsChange" @warn="displayWarning"
      :programStage="programStage" :annotations="annotations" :drawingState="drawingState"/>
  </section>

  <QueryPage v-if="programStage == 5" @programStageChange="programStageChange" :programStage="programStage" :annotations="annotations"/>

  <q-dialog v-model="warningDisplayed" seamless position="top">
    <q-card class="bg-warning text-black">
      <q-card-section id="card-section" class="row items-center no-wrap">
        <div id="warning-msg">{{warningMessage}}</div>
        <q-btn flat round icon="close" v-close-popup />
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<style scoped>
  #title {
    user-select: none;
    -webkit-user-select: none;
  }
  
  #canvas-section {
    background-color: #666;
    height: calc(100% - 155px - 32px);
    width: 100%;
  }

  #input-section {
    background-color: #333;
    height: 155px;
    width: 100%;
  }

  #card-section {
    padding: 0.5em 1em 0 1em;
  }

  #warning-msg {
    padding: 0;
  }
</style>
