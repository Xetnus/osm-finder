<script>
  export default {
    props: ['annotations'],
    emits: ['next', 'back', 'annotationsChange'],
    created() {
      this.handleNext();
    },
    data() {
      return {
        maxDistance: '',
        minDistance: '',
        angle: '',
        error: '',
        current1: '',
        current2: '',
        primaryRemaining: this.annotations.slice(0),
        secondaryRemaining: [],
      }
    },
    methods: {
      handleNext(event) {
        if (this.current1 && this.current2) {
          // Commit these properties to the global state
          let maxD = this.maxDistance;
          let minD = this.minDistance;
          let angle = this.angle;
          let error = this.error;

          console.log(maxD, minD, angle, error)
        }

        if (this.secondaryRemaining.length > 0) {
          this.current2 = this.secondaryRemaining.pop();
          this.hideAllButTwo(this.current1, this.current2);
        } else if (this.primaryRemaining.length > 1) {
          this.current1 = this.primaryRemaining.pop();
          this.secondaryRemaining = this.primaryRemaining.slice(0);
          this.current2 = this.secondaryRemaining.pop();
          this.hideAllButTwo(this.current1, this.current2);
        } else {
          this.showAll();
          this.$emit('next');
        }
      },
      handleBack(event) {
        this.showAll();
        this.$emit('back');
      },
      hideAllButTwo(hide1, hide2) {
        let anns = this.annotations;
        for (var i = 0; i < this.annotations.length; i++) {
          let match = anns[i].name == hide1.name || anns[i].name == hide2.name;
          anns[i].transparent = match ? false : true;
        }
        this.$emit('annotationsChange', anns);
      },
      showAll() {
        let anns = this.annotations;
        for (var i = 0; i < this.annotations.length; i++) {
          anns[i].transparent = false;
        }
        this.$emit('annotationsChange', anns);
      }
    }
  }
</script>

<template>
  <p>Relationship between {{current1.name}} and {{current2.name}}</p>
  <div>
    <button @click="handleBack" id="back">Back</button>
    <input v-model="maxDistance" placeholder="Max distance (m)"/>
    <input v-model="minDistance" placeholder="Min distance (m)"/>
    <input v-model="angle" placeholder="Angle"/>
    <input v-model="error" placeholder="Error"/>
    <button @click="handleNext" id="next">Next</button>
  </div>
</template>

<style scoped>
  p {
    font-weight: bold;
    font-size: 20px;
    text-align: center;
    margin-bottom: 0.4em;
  }

  input {
    width: 10em;
  }

  div {
    display: flex;
    gap: 20px;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
  }
</style>
