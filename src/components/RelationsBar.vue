<script>
  import {calculateIntersection} from '../assets/generalTools.js'

  export default {
    props: ['annotations', 'relationsHistory'],
    emits: ['next', 'back', 'annotationsChange', 'relationsHistoryChange'],
    beforeMount() {
      if (this.relationsHistory.length == 0) {
        this.primaryRemaining = this.annotations.slice(0);

        // Orders the annotations alphanumerically. This is necessary to ensure that the relation
        // information is attached to the annotation whose name comes first when sorted.
        this.primaryRemaining.sort((a, b) => {
          if (a.name < b.name)
            return -1;
          else if (a.name > b.name)
            return 1;
          else
            return 0;
        });

        let secondaryRemaining = [];
        let primaryRemaining = this.annotations.slice(0);
        let primary = null;
        let second = null;

        // Generates a sequential list of relations from all of the annotations in the network. 
        while(primaryRemaining.length > 1) {
          if (secondaryRemaining.length > 0) {
            second = secondaryRemaining.pop();
            this.nextRelations.push([primary, second]);
          } else {
            primary = primaryRemaining.pop();
            secondaryRemaining = primaryRemaining.slice(0);
            second = secondaryRemaining.pop();
            this.nextRelations.push([primary, second]);
          }
        }
        
        this.handleNext();
      } else {
        this.handleBack();
      }
    },
    data() {
      return {
        maxDistance: null,
        minDistance: null,
        angle: null,
        error: null,
        current1: null,
        current2: null,
        nextRelations: [],
      }
    },
    methods: {
      handleNext(event) {
        if (this.current1 && this.current2) {
          this.relationsHistory.push([this.current1, this.current2]);

          // Commit these properties to the global state. 
          let index = this.annotations.findIndex((el) => el.name == this.current2.name);
          const maxD = Number.isInteger(parseInt(this.maxDistance)) ? parseInt(this.maxDistance) : null;
          const minD = Number.isInteger(parseInt(this.minDistance)) ? parseInt(this.minDistance) : null;
          const angle = Number.isInteger(parseInt(this.angle)) ? parseInt(this.angle) : null;
          const error = Number.isInteger(parseInt(this.error)) ? parseInt(this.error) : null;
          const rel = {maxDistance: maxD, minDistance: minD, angle: angle, error: error};

          let ann = this.annotations;
          ann[index].relations[this.current1.name] = rel;

          this.$emit('annotationsChange', ann);
        }

        if (this.nextRelations.length == 0) {
          this.showAll();
          this.$emit('relationsHistoryChange', this.relationsHistory);
          this.$emit('next');
          return;
        }

        let current = this.nextRelations.pop();
        this.current1 = current[0];
        this.current2 = current[1];

        this.fillInForm();
        this.hideAllButTwo(this.current1, this.current2);
      },

      handleBack(event) {
        if (this.current1 && this.current2) {
          this.nextRelations.push([this.current1, this.current2]);
        }
        
        if (this.relationsHistory.length == 0) {
          this.showAll();
          this.$emit('relationsHistoryChange', []);
          this.$emit('back');
          return;
        }

        let current = this.relationsHistory.pop();
        this.current1 = current[0];
        this.current2 = current[1];

        this.fillInForm();
        this.hideAllButTwo(this.current1, this.current2);
      },

      fillInForm() {
        // Initializes the inputs to the defaults or, if data has already been stored
        // for this relation, fills that data in.
        const match = this.current2.relations[this.current1.name];
        this.maxDistance = match ? match.maxDistance : '';
        this.minDistance = match ? match.minDistance : '';
        this.angle = match ? match.angle : '';
        this.error = match ? match.error : '';
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
