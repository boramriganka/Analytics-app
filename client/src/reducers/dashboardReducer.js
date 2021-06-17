import { combineReducers } from "redux";
import * as actionTypes from "./dashboardActions";
import App from "../.././src/components/App.js"

let initialState = {
  chartData: {},
  pieChartData: {},
  formData: {},
  //dataLoading:"false",
   ratingItem: {
    itemSelected: "",
    items: [
      { rating: 1 },
      { rating: 2 },
      { rating: 3 },
      { rating: 4 },
      { rating: 5 },
      { rating: 6 },
      { rating: 7 },
      { rating: 8 },
      { rating: 9 },
      { rating: 10 }
    ]
  }
};
/*var keys = ["name" ,"y"];
var namesPie = []
var  pricesPie = []
var gdata = []
var isloading = "false"
//console.log(initialState.dataLoading)
console.log("truyr")
export const piieChartData = {
  title: {
    text: "Top Selling Product"
  },
  chart: {
    type: "pie"
  },
  series: [{data:[gdata]
  }
  ]  
};*/



const _addBarChart = (state, dataProp) => {
  console.log("in addBarChart ");
  const barChartData = dataProp;
  return {
    ...state,
    chartData: barChartData
  };
};

const _addPieChart = (state, dataProp) => {
  console.log(dataProp)

  console.log("in addPieChart ");
  const chartData = dataProp;
  return {
    ...state,
    pieChartData: chartData
  };
};
const _addFormData = (state, dataProp) => {
  alert(JSON.stringify(dataProp));
};
const _onNameChange = (state, dataProp) => {
  alert(dataProp.target.value);
};
const _bindFormDataState = (state, dataProp) => {
  const dashboardFormData = dataProp;
  return {
    ...state,
    formData: dashboardFormData
  };
};

const _selectItem = (state, dataProp) => {
  const itemSelected = dataProp;

  return {
    ...state,
    ratingItem: {
      ...state.ratingItem,
      itemSelected: itemSelected
    }
  };
};

const reducer = (state = initialState, action) => {
  switch (action.type ) {
    case actionTypes.BAR_CHART:
      
      state = _addBarChart(state, action.dataBarChart);
      
      break;
    case actionTypes.PIE_CHART:
      state = _addPieChart(state, action.pieChartData);
      
      break;
    case actionTypes.ADD_FORM_ITEM:
      state = _addFormData(state, action.formData);
      break;
    case actionTypes.ON_NAME_CHANGE:
      state = _onNameChange(state, action.formData);
      break;
    case actionTypes.BIND_FORM_DATA_STATE:
      state = _bindFormDataState(state, action.formData);
      break;
    case actionTypes.SELECT_ITEM:
      state = _selectItem(state, action.selectedItem);
      break;
  }
  return state;
};
export default reducer;
