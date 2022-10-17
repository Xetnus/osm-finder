<script>
  export default {
    props: ['annotations', 'hiddenAnnotations'],
    emits: ['next', 'back', 'annotationsChange', 'hiddenAnnotationsChange'],
    created() {
      this.current1 = this.primaryRemaining.pop();
      this.secondaryRemaining = this.primaryRemaining.slice(0);
      this.current2 = this.secondaryRemaining.pop();
      this.hideAllButTwo(this.current1.name, this.current2.name);
    },

    /**
     * TODO:
     * - improve hiding capability (possibly using this.annotations)
     * - actually use the user input
     */

    data() {
      return {
        maxDistance: '',
        minDistance: '',
        angle: '',
        error: '',
        blacklisted: this.hiddenAnnotations.slice(0), // Keeps the initial list of annotations that were undone
        current1: '',
        current2: '',
        primaryRemaining: this.annotations.filter((ann, i) => !this.hiddenAnnotations.includes(i)),
        secondaryRemaining: [],
      }
    },
    methods: {
      handleNext(event) {
        // Commit these properties to the global state
        let maxD = this.maxDistance;
        let minD = this.minDistance;
        let angle = this.angle;
        let error = this.error;

        console.log(maxD, minD, angle, error)

        if (this.secondaryRemaining.length > 0) {
          this.current2 = this.secondaryRemaining.pop();
          this.hideAllButTwo(this.current1.name, this.current2.name);
        } else if (this.primaryRemaining.length > 0) {
          this.current1 = this.primaryRemaining.pop();
          this.secondaryRemaining = this.primaryRemaining.slice(0);
          this.current2 = this.secondaryRemaining.pop();

          if (this.current2 == null) {
            this.setHiddenAnnotations(this.blacklisted); // Reset hidden annotations
            this.$emit('next');
            return
          }

          this.hideAllButTwo(this.current1.name, this.current2.name);
        } else {
          this.setHiddenAnnotations(this.blacklisted); // Reset hidden annotations
          this.$emit('next');
        }
      },
      handleBack(event) {
        this.setHiddenAnnotations(this.blacklisted); // Reset hidden annotations
        this.$emit('back');
      },
      hideAllButTwo(name1, name2) {
        // Hides every annotation except for the current 2
        let index1 = this.annotations.findIndex(ann => ann.name == name1);
        let index2 = this.annotations.findIndex(ann => ann.name == name2);
        let hidden = [...Array(this.annotations.length).keys()];
        hidden = hidden.filter(i => i != index1 && i != index2)
        this.setHiddenAnnotations(hidden);
      },
      setHiddenAnnotations(hide) {
        let hidden = this.hiddenAnnotations;
        hidden = hide;
        this.$emit('hiddenAnnotationsChange', hidden);
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
