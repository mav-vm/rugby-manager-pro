'use strict';

const LICENSE_STORAGE_KEY =
  'rmmLicense';

const license = {

  get(){

    try{

      return JSON.parse(
        localStorage.getItem(
          LICENSE_STORAGE_KEY
        ) || '{}'
      );

    }catch{

      return {};
    }
  },

  save(data){

    localStorage.setItem(
      LICENSE_STORAGE_KEY,
      JSON.stringify(data)
    );
  },

  clear(){

    localStorage.removeItem(
      LICENSE_STORAGE_KEY
    );
  },

  type(){

    const data =
      this.get();

    return (
      data.type ||
      'FREE'
    );
  },

  status(){

    const data =
      this.get();

    return (
      data.status ||
      'FREE'
    );
  },

  key(){

    const data =
      this.get();

    return (
      data.key ||
      ''
    );
  },

  customerId(){

    const data =
      this.get();

    return (
      data.customerId ||
      ''
    );
  },

  isActive(){

    return (
      this.status() ===
      'ATTIVA'
    );
  },

  isPro(){

    return (
      this.isActive() &&
      (
        this.type() === 'PRO' ||
        this.type() === 'SOCIETA'
      )
    );
  },

  isSocieta(){

    return (
      this.isActive() &&
      this.type() ===
      'SOCIETA'
    );
  }
};