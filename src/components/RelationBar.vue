<script>
import {calculateIntersection} from '../assets/generalTools.js'

  export default {
    props: ['annotations'],
    emits: ['next', 'back', 'annotationsChange'],
    created() {
      this.primaryRemaining = this.annotations.slice(0);

      // Orders the annotations alphanumerically. This is necessary to ensure that the relation
      // information is attached to the annotation whose name comes first when sorted.
      this.primaryRemaining.sort((a, b) => {
        if (a.name < b.name)
          return -1;
        else if (a.name > b.name)
          return 1;

        return 0;
      });
      
      this.handleNext();
    },
    data() {
      return {
        maxDistance: null,
        minDistance: null,
        angle: null,
        error: null,
        current1: null,
        current2: null,
        primaryRemaining: [],
        secondaryRemaining: [],
      }
    },
    methods: {
      handleNext(event) {
        if (this.current1 && this.current2) {
          const maxD = this.maxDistance;
          const minD = this.minDistance;
          const angle = this.angle;
          const error = this.error;

          let index = this.annotations.findIndex((el) => el.name == this.current2.name);
          // Commit these properties to the global state. 
          let ann = this.annotations;
          const rel = {maxDistance: maxD, minDistance: minD, angle: angle, error: error};
          ann[index].relations[this.current1.name] = rel;

          this.$emit('annotationsChange', ann);
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

        // Initializes the inputs to the defaults or, if data has already been stored
        // for this relation, fills that data in.
        const match = this.current2.relations[this.current1.name];
        this.maxDistance = match ? match.maxDistance : '';
        this.minDistance = match ? match.minDistance : '';
        this.angle = match ? match.angle : '';
        this.error = match ? match.error : '';
      },
      handleBack(event) {
        this.showAll();
        this.$emit('back');
      },
      hideAllButTwo(hide1, hide2) {
        let anns = this.annotations;
        for (let i = 0; i < this.annotations.length; i++) {
          let match = anns[i].name == hide1.name || anns[i].name == hide2.name;
          anns[i].transparent = match ? false : true;
        }
        this.$emit('annotationsChange', anns);
      },
      showAll() {
        let anns = this.annotations;
        for (let i = 0; i < this.annotations.length; i++) {
          anns[i].transparent = false;
        }
        this.$emit('annotationsChange', anns);
      },
      intersects() {
        const line1 = this.current1.points;
        const line2 = this.current2.points;
        const intersection = calculateIntersection(line1[0], line1[1], line1[2], line1[3], line2[0], line2[1], line2[2], line2[3]);
        return intersection && intersection.seg1 && intersection.seg2;
      },
    }
  }
</script>

<template>
  <p>Relationship between {{current1.name}} and {{current2.name}}</p>
  <div>
    <button @click="handleBack">Back</button>
    <input :disabled="intersects()" v-model="maxDistance" placeholder="Max distance (m)"/>
    <input :disabled="intersects()" v-model="minDistance" placeholder="Min distance (m)"/>
    <input v-model="angle" placeholder="Angle"/>
    <input v-model="error" placeholder="Error"/>
    <button @click="handleNext">Next</button>
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
