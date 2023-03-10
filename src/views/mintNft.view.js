import React, { useState, useEffect,useParams } from "react";
import PropTypes from "prop-types";
import { useFormik } from "formik";
import * as Yup from "yup";
import { ApolloClient, InMemoryCache, gql } from '@apollo/client'
import { acceptedFormats, currencys } from "../utils/constraint";
import load from "../assets/landingSlider/img/loader.gif";
import uploadImg from "../assets/img/UPLOAD.png";
import {
  estimateGas,
  fromNearToEth,
  fromNearToYocto,
  fromYoctoToNear,
  getNearAccount,
  getNearContract,
  storage_byte_cost,
} from "../utils/near_interaction";
import { uploadFileAPI } from '../utils/pinata'
import Swal from 'sweetalert2'
import { useTranslation } from "react-i18next";
import trashIcon from '../assets/img/bin.png';
import { useWalletSelector } from "../utils/walletSelector";
function LightHeroE(props) {
  const { selector, modal, accounts, accountId } = useWalletSelector();
  //este estado contiene toda la info de el componente
  const [mint, setmint] = React.useState({
    file: undefined,
    blockchain: localStorage.getItem("blockchain"),
  });
  const [collecData, setCollecData] = useState([])
  const [combo, setcombo] = useState(true);
  const [collection, setcollection] = useState(false);
  const [comboCol, setcomboCol] = useState(true);
  const [contData, setcontData] = useState("")
  const [collTitle, setcollTitle] = useState("")
  const [colID, setColID] = useState("")
  const [t, i18n] = useTranslation("global")
  const [loading, setLoading] = useState(false);


  const [actualDate, setactualDate] = useState("");
  let collectionData

  const [formFields, setFormFields] = useState([])

  const handleFormChange = (event, index) => {
    let data = [...formFields];
    data[index][event.target.name] = event.target.value;
    setFormFields(data);
  }

  const submit = (e) => {
    e.preventDefault();
    console.log(formFields)
  }

  const addFields = () => {
    let object = {
      account: '',
      percent: ''
    }
    if (formFields.length == 6) {
      return
    }
    setFormFields([...formFields, object])
  }

  const removeFields = (index) => {
    let data = [...formFields];
    data.splice(index, 1)
    setFormFields(data)
  }

  const APIURL = process.env.REACT_APP_API_TG
  //guardara todos los valores del formulario
  const pru = (parseInt(Math.random() * 100000) + 1);

  const formik = useFormik({
    initialValues: {
      title: "",
      description: "",
      price: 0,
      culture: "",
      country: "",
      image: "",
      date: "",
      hrs: "",
      min: "",
      titleCol: "",
      descriptionCol: "",
      contractCol: "",
    },
    //validaciones
    validationSchema: Yup.object({
      title: Yup.string()
        .max(60, t("MintNFT.maxTitle"))
        .required(t("MintNFT.required"))
        .min(5, t("MintNFT.minTitle")),

      description: Yup.string()
        .max(1000, t("MintNFT.maxDesc"))
        .required(t("MintNFT.required"))
        .min(5, t("MintNFT.minDesc")),

      // price: Yup.number()
      //   .required(t("MintNFT.required"))
      //   .positive(t("MintNFT.posPrice"))
      //   .moreThan(0.09999999999999, t("MintNFT.morePrice"))
      //   .min(0.1, t("MintNFT.minPrice")),


      image: Yup.string().required(t("MintNFT.required")),
    }),
    onSubmit: async (values) => {
      //evitar que el usuario pueda volver a hacer click hasta que termine el minado
      setmint({ ...mint, onSubmitDisabled: true });
      let account;
      if (mint.blockchain == "0") {
        return
      } else {
        let percentage = 0
        let royalties = {}
        let success = true
        let royalText = ""
        console.log(formFields)
        if (formFields.length > 0) {
          formFields.map(async (data, index) => {
            if (data.account == "" || data.percent == "") {
              Swal.fire({
  
                icon: 'error',
                html:
                '<div>'+
                '<div class="font-open-sans dark:text-darkgray text-xl font-bold">' + t("MintNFT.swVoid") + '</div>'+ 
                '<div class="font-open-sans dark:text-darkgray  text-sm">' +  t("MintNFT.swVoidTxt") + '</div>'+
                '</div>',
                confirmButtonColor: '#E79211'
              })
              setmint({ ...mint, onSubmitDisabled: false });
              success = false
              return
            }
            if (!data.account.includes(process.env.REACT_APP_NEAR_ENV == "mainnet" ? ".near" : ".testnet")) {
              Swal.fire({
                html:
                '<div>'+
                '<div class="font-open-sans dark:text-darkgray text-xl font-bold">' + t("MintNFT.swNet")  + '</div>'+ 
                '<div class="font-open-sans dark:text-darkgray  text-sm">' + t("MintNFT.swNetTxt") + (process.env.REACT_APP_NEAR_ENV == "mainnet" ? ".near" : ".testnet") + '</div>'+
                '</div>',
                icon: 'error',
                confirmButtonColor: '#E79211'
              })
              setmint({ ...mint, onSubmitDisabled: false });
              success = false
              return
            }
            let account = data.account
            let percent = data.percent
            percentage = percentage + parseFloat(percent)
            console.log(index)
            let info = JSON.parse('{"' + account + '" : ' + (percent * 100) + '}')
            royalText = royalText + account + " : " + percent + "%<br>"
            royalties = { ...royalties, ...info }
          })
          console.log(royalties)
          console.log(percentage)
          if (percentage > 50) {
            Swal.fire({
              html:
              '<div>'+
              '<div class="font-open-sans dark:text-darkgray text-xl font-bold">' + t("MintNFT.swPer")  + '</div>'+ 
              '<div class="font-open-sans dark:text-darkgray  text-sm">' + t("MintNFT.swPerTxt") + '</div>'+
              '</div>',
              icon: 'error',
              confirmButtonColor: '#E79211'
            })
            success = false
            setmint({ ...mint, onSubmitDisabled: false });
            return
          }
        }

        let contract = await getNearContract();
        const data = await contract.account.connection.provider.block({
          finality: "final",
        });
        const dateActual = (data.header.timestamp) / 1000000;
        const owner = accountId
        console.log(fromNearToYocto(values.price))
        let payload = {
          metadata: {
            title: values.title,
            description: values.description,
            media: values.image,
          },
          receiver_id: owner
        }
        let amount = fromNearToYocto(process.env.REACT_APP_FEE_CREATE_NFT);
        console.log(royalText)
        if (success) {
          if (Object.keys(royalties) != 0) {
            payload = { ...payload, ...{ perpetual_royalties: royalties } }
            Swal.fire({
              html:                
              '<div>'+
              '<div class="font-open-sans dark:text-darkgray text-xl font-bold">' + t("MintNFT.swVer") + '</div>'+ 
              '<div class="font-open-sans dark:text-darkgray  text-sm">' + royalText + '</div>'+
              '</div>',
              icon: 'warning',
              showCancelButton: true,
              confirmButtonColor: '#E79211',
              cancelButtonColor: '#d33',
              confirmButtonText: "Crear NFT"
            }).then(async (result) => {
              if (result.isConfirmed) {
                console.log("Creando NFT")
                const wallet = await selector.wallet();
                wallet.signAndSendTransaction({
                  signerId: accountId,
                  receiverId: process.env.REACT_APP_CONTRACT,
                  actions: [
                    {
                      type: "FunctionCall",
                      params: {
                        methodName: "nft_mint",
                        args: payload,
                        gas: 300000000000000,
                        deposit: amount,
                      }
                    }
                  ]
                })
                // let tokenres = await contract.nft_mint(
                //   payload,
                //   300000000000000,
                //   amount,
                // )
              }
              else if (result.isDismissed) {
                setmint({ ...mint, onSubmitDisabled: false });
              }
            })
          }
          else {
            const wallet = await selector.wallet();
            wallet.signAndSendTransaction({
              signerId: accountId,
              receiverId: process.env.REACT_APP_CONTRACT,
              actions: [
                {
                  type: "FunctionCall",
                  params: {
                    methodName: "nft_mint",
                    args: payload,
                    gas: 300000000000000,
                    deposit: amount,
                  }
                }
              ]
            })
            // let tokenres = await contract.nft_mint(
            //   payload,
            //   300000000000000,
            //   amount,
            // )
          }
          console.log(payload)
        }
      }
      //if de error

    },
  });

  /**
   * hace que cuando se toque la imagen se cambien el valor de touch de formik
   */
  function imageClick() {
    formik.setFieldTouched("image");
  }
  /**
   * cada vez que el usuario cambia de archivo se ejecuta esta funcion
   *
   */

  async function uploadFilePinata(e){
    let file = e.target.files[0]
    setmint({ ...mint, file: URL.createObjectURL(e.target.files[0]) });
    let cid = await uploadFileAPI(file)
    formik.setFieldValue("image", cid);
    console.log(cid)
  }

  
  const format = (v) => {
    return v < 10 ? "0" + v : v;
  }
  const fechaActual = async () => {
    let contract = await getNearContract();
    const data = await contract.account.connection.provider.block({
      finality: "final",
    });
    const dateActual = new Date((data.header.timestamp) / 1000000);
    const fs = format(dateActual.getFullYear()) + "-" + (format(dateActual.getMonth() + 1)) + "-" + format(dateActual.getDate());
    setactualDate(fs)
  }

 
  return (
    <section className="text-gray-600 body-font bg-crear-background bg-cover bg-no-repeat">
      {loading ?
        <>
          <div className="grid grid-cols-1 gap-4 place-content-center items-center">
            <h1 className="text-5xl font-semibold pt-60 text-center ">{t("MintNFT.load")}</h1>
            <h1 className="text-5xl font-semibold pt-10 text-center ">{t("MintNFT.loadMsg")}</h1>
          </div>

        </>
        :
        <>
          {/* {collection ? */}
          <>
          <div className="font-raleway font-bold text-center py-10 text-3xl md:text-6xl text-darkgray uppercase">{t("MintNFT.new")}</div>
            <form
              onSubmit={formik.handleSubmit}
              className="container mx-auto flex px-5 py-10 md:pt-0 lg:pt-5 lg:pb-24 md:flex-row flex-col items-center"
            >
              <div className=" md:w-1/2 lg:w-3/4 w-5/6 mb-10 md:mb-0 items-center relative pt-10 md:pt-0">
                {mint?.file && (
                  <img
                    className="rounded m-auto "
                    width="50%"
                    alt="hero"
                    src={mint?.file}
                  />
                )}
                <label
                  className={` title-font sm:text-4xl text-3xl  font-medium absolute inset-0  w-full lg:w-3/4 mx-auto flex flex-col items-center   rounded-lg  tracking-wide uppercase  cursor-pointer justify-center`}
                >
                  <div
                    className={`flex  rounded-xlarge  w-full   mx-0     mb-2 bg-gradient-to-b p-[2px] from-yellow  to-brown font-open-sans  flex-col leading-7 "
                      }
              `}
                  >
                    {mint?.file ? 
                    <div className="flex flex-col leading-7 text-sm h-[45px] dark:bg-white dark:text-darkgray   rounded-xlarge justify-center focus-visible:outline-none text-center  shadow-brown-s w-full font-semibold font-raleway">{t("MintNFT.changeImg")}</div> : 
                    <div className="flex flex-col leading-7 text-sm h-[170px] lg:h-[300px] dark:bg-white dark:text-darkgray   rounded-xlarge justify-center focus-visible:outline-none text-center  shadow-brown-s w-full font-semibold font-raleway">
                    <img src={uploadImg} className="h-[150px] lg:h-[250px] object-contain" alt='nft'></img><span className="text-sm">{t("MintNFT.upImg")}</span></div>}
                  </div>
                  <input
                    onChange={uploadFilePinata}
                    onClick={imageClick}
                    type="file"
                    id="image"
                    name="image"
                    className={`  hidden `}
                    accept={acceptedFormats}
                  />
                </label>
                {formik.touched.image && formik.errors.image ? (
                  <div className="flex leading-7 text-sm text-red-600 text-center mb-10 justify-center  font-open-sans">
                    {formik.errors.image}
                  </div>
                ) : null}
              </div>
              <div className=" lg:w-full md:w-1/2 w-full lg:pl-24 md:pl-16 flex flex-col md:items-start md:text-left items-center text-center pb-4 mt-12 md:mt-0">
                <div className="flex flex-row w-full md:justify-start justify-center items-end">
                  <div className="relative mr-4  w-3/4">
                    <div className="flex justify-between ">
                      <label
                        htmlFor="title"
                        className=" leading-7 text-sm  dark:text-darkgray  uppercase font-semibold font-raleway"
                      >
                        {t("MintNFT.titleTxt")}
                      </label>
                      {formik.touched.title && formik.errors.title ? (
                        <div className="leading-7 text-sm text-red-600 font-open-sans">
                          {formik.errors.title}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex  rounded-xlarge  w-full  h-[45px] mx-0   mb-2 bg-gradient-to-b p-[2px] from-yellow  to-brown ">
                      <input
                        type="text"
                        id="title"
                        name="title"
                        {...formik.getFieldProps("title")}
                        className={`font-open-sans  flex flex-col  h-full dark:bg-white dark:text-darkgray   text-left rounded-xlarge justify-center focus-visible:outline-none focus-visible:shadow-s focus-visible:shadow-s focus-visible:shadow-brown-s w-full`}
                      />
                    </div>

                    {/* <div className="flex justify-between ">
                <label
                  htmlFor="price"
                  className="leading-7 text-sm text-gray-600"
                >

                  {t("MintNFT.priceTxt")}
                  {" " +
                    currencys[parseInt(localStorage.getItem("blockchain"))]}
                </label>
                {formik.touched.price && formik.errors.price ? (
                  <div className="leading-7 text-sm text-red-600">
                    {formik.errors.price}
                  </div>
                ) : null}
              </div>

              <input
                type="number"
                id="price"
                name="price"
                min="0.1"
                step="0.1"
                className={`border-none w-full bg-gray-100 bg-opacity-50 rounded   focus:bg-transparent  text-base outline-none text-gray-700 py-1 px-3 leading-8 transition-colors duration-200 ease-in-out-${props.theme}-500 text-base outline-none text-gray-700 py-1 px-3 leading-8 transition-colors duration-200 ease-in-out`}
                {...formik.getFieldProps("price")}
              /> */}
                    <div className="flex justify-between ">
                      <label
                        htmlFor="description"
                        className="leading-7 text-sm dark:text-darkgray  uppercase font-semibold font-raleway"
                      >
                        {t("MintNFT.descTxt")}
                      </label>
                      {formik.touched.description && formik.errors.description ? (
                        <div className="leading-7 text-sm text-red-600 font-open-sans">
                          {formik.errors.description}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex  rounded-xlarge  w-full h-[45px] mx-0     mb-2 bg-gradient-to-b p-[2px] from-yellow  to-brown ">
                      <textarea
                        type="textarea"
                        id="description"
                        name="description"
                        rows="5"
                        {...formik.getFieldProps("description")}
                        className={`font-open-sans flex flex-col  h-full dark:bg-white dark:text-darkgray   text-left rounded-xlarge justify-center focus-visible:outline-none focus-visible:shadow-brown-s w-full`}
                      />
                    </div>


                    <div className="flex justify-between ">
                      <label
                        htmlFor="royalties"
                        className="leading-7 text-sm  dark:text-darkgray   uppercase font-semibold font-raleway"
                      >
                        {t("MintNFT.lblRoyalties")}
                      </label>
                    </div>

                    <div>
                      <div>
                        {formFields.map((form, index) => {
                          return (
                            <div key={index} className="w-full flex  gap-4 mt-1">
                              <div className="flex  rounded-xlarge  w-7/12 h-[45px] mx-0     mb-2 bg-gradient-to-b p-[2px] from-yellow  to-brown ">
                                <input
                                name='account'
                                placeholder={t("MintNFT.placeAccount")}
                                className="font-open-sans flex flex-col  h-full dark:bg-white dark:text-darkgray  text-left rounded-xlarge justify-center focus-visible:outline-none  focus-visible:shadow-brown-s w-full"
                                onChange={event => handleFormChange(event, index)}
                                value={form.name}
                              />
                              </div>
                              
                              <div className="flex  rounded-xlarge  w-3/12 h-[45px] mx-0    mb-2 bg-gradient-to-b p-[2px] from-yellow  to-brown ">
                                <input
                                  type="number"
                                  min="0.1"
                                  step="0.1"
                                  name='percent'
                                  placeholder={t("MintNFT.placePercent")}
                                  className="font-open-sans flex flex-col  h-full dark:bg-white dark:text-darkgray   text-left rounded-xlarge justify-center focus-visible:outline-none  focus-visible:shadow-brown-s w-full "
                                  onChange={event => handleFormChange(event, index)}
                                  value={form.age}
                                />
                              </div>
                              <button type="button" onClick={() => removeFields(index)} className="w-2/12 rounded-xlarge mb-2 content-fit font-bold dark:text-darkgray  bg-red-600 border-0 py-2 focus:outline-none hover:bg-brown  text-sm uppercase font-open-sans">
                                      <svg fill="#000" xmlns="http://www.w3.org/2000/svg"  viewBox="0 0 24 24" width="20px" height="24px"><path d="M 10 2 L 9 3 L 4 3 L 4 5 L 5 5 L 5 20 C 5 20.522222 5.1913289 21.05461 5.5683594 21.431641 C 5.9453899 21.808671 6.4777778 22 7 22 L 17 22 C 17.522222 22 18.05461 21.808671 18.431641 21.431641 C 18.808671 21.05461 19 20.522222 19 20 L 19 5 L 20 5 L 20 3 L 15 3 L 14 2 L 10 2 z M 7 5 L 17 5 L 17 20 L 7 20 L 7 5 z M 9 7 L 9 18 L 11 18 L 11 7 L 9 7 z M 13 7 L 13 18 L 15 18 L 15 7 L 13 7 z"/></svg>                             
                              </button>
                            </div>
                          )
                        })}
                      </div>
                      <div className="relative group mt-4 rounded-xlarge">
                        <div className="absolute -inset-0.5 bg-[#5aee8c]  rounded-xlarge blur opacity-70 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt group-hover:-inset-1"></div>
                        <button type="button" onClick={addFields} className="relative w-full  rounded-xlarge dark:text-white font-bold bg-lime-600 py-2 text-base uppercase font-open-sans">{t("MintNFT.btnRoyalties")}</button>
                      </div>
                    </div>

                    <div className="relative group mt-10 rounded-xlarge">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-[#f2b159] to-[#ca7e16] rounded-full blur opacity-70 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt group-hover:-inset-1"></div>
                      <button
                          type="submit"
                          className={`relative w-full bg-yellow2 rounded-xlarge uppercase font-open-sans text-base px-6 py-2 font-bold border-2 border-yellow2 dark:text-white`}
                          disabled={mint?.onSubmitDisabled}
                        >
                          {t("MintNFT.createNFT")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
            
          </>
        </>}


    </section>
  );
}

LightHeroE.defaultProps = {
  theme: "yellow",
};

LightHeroE.propTypes = {
  theme: PropTypes.string.isRequired,
};

export default LightHeroE;
