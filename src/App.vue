<script setup>
  import InteractiveCanvas from './components/InteractiveCanvas.vue'
  import InputBar from './components/InputBar.vue'
</script>

<script>
  import defaultImage from './components/Massachusetts turnpike.jpg';
  export default {
    data() {
      return {
        image: null
      }
    },
    created() {
      const img = new Image();
      img.src = defaultImage;
      img.onload = () => {
        this.image = img;
      };
    },
    methods: {
      upload() {
        // Lets the user upload a photo
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
      }
    },
  }
</script>

<template>
  <header>
    <p>OSM Finder</p>
  </header>

  <section id="canvas-section">
    <InteractiveCanvas :image="image"/>
  </section>

  <section id="input-section">
    <InputBar @upload="upload"/>
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
