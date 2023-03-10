/* global BigInt */
import React, { useState } from "react";
import PropTypes from "prop-types";
import { useParams, useHistory } from "react-router-dom";
import { isNearReady } from "../utils/near_interaction";
import { nearSignIn, ext_view, ext_call } from "../utils/near_interaction";
import { ApolloClient, InMemoryCache, gql } from '@apollo/client'

import { currencys } from "../utils/constraint";
import {
  fromNearToYocto,
  fromYoctoToNear,
  getNearAccount,
  getNearContract,
} from "../utils/near_interaction";
import flechaiz from '../assets/landingSlider/img/flechaIz.png'
import ReactHashtag from "react-hashtag";
import OfferModal from "../components/offerModal.component";
import AddTokenModal from "../components/addTokenModal.component";
import loadingGif from "../assets/img/loadingGif.gif"
import { useTranslation } from "react-i18next";
import Swal from 'sweetalert2'
import { use } from "i18next";
import { useWalletSelector } from "../utils/walletSelector";
import { providers, utils } from "near-api-js";

function LightEcommerceB(props) {
  //guarda el estado de  toda la vista
  const { selector, modal, accounts, accountId } = useWalletSelector();
  const [state, setstate] = useState();
  const [btn, setbtn] = useState(true);
  const [t, i18n] = useTranslation("global")
  
  //Esta logeado
  const [stateLogin, setStateLogin] = useState(false);
  const [hasRoyalty, setHasRoyalty] = useState(false)
  const [hasBids, setHasBids] = useState(false)
  const [creator, setCreator] = useState(false)
  const [noCollection, setNoCollection] = useState(false)
  const [loadInfo, setLoadInfo] = useState(false)
  //es el parametro de tokenid
  const { data } = useParams();
  //es el historial de busqueda
  //let history = useHistory();
  const APIURL= process.env.REACT_APP_API_TG
  const handleSignIn = () =>{
    modal.show();
  }

  React.useEffect(() => {
    (async () => {
      setStateLogin(accountId !=null ? true : false);
      let ownerAccount = accountId;
 

      let totalSupply;

      if (localStorage.getItem("blockchain") == "0") {
      } else {

        
        let contract = await getNearContract();
        let account = await getNearAccount();
        let tokenId = data;
        let userData

        const query = `
          query($tokenID: String){
            tokens (where : {id : $tokenID}){
              id
              collectionID
            }
          }
        `
        const client = new ApolloClient({
          uri: APIURL,
          cache: new InMemoryCache(),
        })

        await client.query({
          query: gql(query),
          variables: {
            tokenID: tokenId
          }
        })
          .then((data) => {
            console.log('token Data: ', data.data.tokens)
            if (data.data.tokens.length <= 0) {
              setNoCollection(true)
            }
            else {
              userData = data.data.tokens
            }
          })
          .catch((err) => {
            console.log('error: ', err)
          })

        let payload = {
          account_id: account,
          token_id: tokenId, 
        };
        let onSale = false
        let priceData = ""
        let bids = []
        let bidder = ""
        let bidPrice = ""
        // let nft = await contract.nft_token(payload);
        const nft_payload = btoa(JSON.stringify(payload))
        const { network } = selector.options;
        const provider = new providers.JsonRpcProvider({ url: network.nodeUrl });
        const res = await provider.query({
            request_type: "call_function",
            account_id: process.env.REACT_APP_CONTRACT,
            method_name: "nft_token",
            args_base64: nft_payload,
            finality: "optimistic",
          })
        let nft = JSON.parse(Buffer.from(res.result).toString())
        console.log(nft)
        let bidsData = await getBids(tokenId)
          console.log(bidsData)
        if(nft.creator_id == accountId){
          setCreator(true)
        }
        if(Object.keys(nft.royalty).length!=0){
          setHasRoyalty(true)
        }        
        if(nft.approved_account_ids.length!=0){
          Object.entries(nft.approved_account_ids).map((approval,i) => {
            if(approval.includes(process.env.REACT_APP_CONTRACT_MARKET)){
              onSale=true
            }
          })
        }
        if(onSale){
          let data = await getSaleData(tokenId)
          priceData = fromYoctoToNear(data.price)
        }
        console.log(bidsData.buyer_id)
        if(bidsData.buyer_id != "null"){
          console.log("Hay oferta :D")
          setHasBids(true)
          bidder = bidsData.buyer_id
          bidPrice = fromYoctoToNear(bidsData.price)
        }
        setLoadInfo(true)
        setstate({
          ...state,
          tokens: {
            tokenID: nft.token_id,
            sale: onSale,
            price: priceData,
            bidder: bidder,
            bidPrice: bidPrice,
            account: accountId,
            owner: nft.owner_id,
            //chunk: parseInt(toks.token_id/2400),
          },
          jdata: {
            image: nft.metadata.media,
            title: nft.metadata.title,
            description: nft.metadata.description,
            royalty: Object.entries(nft.royalty),
            creator: nft.creator_id
          },
          owner: nft.owner_id,
          ownerAccount: ownerAccount,
        });


      }
    })();
  }, []);

  async function getSaleData(tokenID){
    let extPayload={
      nft_contract_token : process.env.REACT_APP_CONTRACT+"."+tokenID
    }
    // let extData = await ext_view(process.env.REACT_APP_CONTRACT_MARKET,"get_sale",extPayload)
    const args_b64 = btoa(JSON.stringify(extPayload))
    const { network } = selector.options;
    const provider = new providers.JsonRpcProvider({ url: network.nodeUrl });
    const res = await provider.query({
      request_type: "call_function",
      account_id: process.env.REACT_APP_CONTRACT_MARKET,
      method_name: "get_sale",
      args_base64: args_b64,
      finality: "optimistic",
    })
    let extData = JSON.parse(Buffer.from(res.result).toString())
    return extData
  }
  async function getBids(tokenID){
    let extPayload={
      nft_contract_id : process.env.REACT_APP_CONTRACT,
      token_id : tokenID
    }
    // let extData = await ext_view(process.env.REACT_APP_CONTRACT_MARKET,"get_offer",extPayload)
    const args_b64 = btoa(JSON.stringify(extPayload))
    const { network } = selector.options;
    const provider = new providers.JsonRpcProvider({ url: network.nodeUrl });
    const res = await provider.query({
      request_type: "call_function",
      account_id: process.env.REACT_APP_CONTRACT_MARKET,
      method_name: "get_offer",
      args_base64: args_b64,
      finality: "optimistic",
    })
    let extData = JSON.parse(Buffer.from(res.result).toString())
    return extData
  }

  async function manageOffer(option){

    
      //get contract
      let contract = await getNearContract();
      //construct payload
      let payload = {
        address_contract: state.tokens.contract,
        token_id: state.tokens.tokenID,
        collection_id: state.tokens.collectionID,
        collection: state.tokens.collection,
        status: Boolean(option) //true or false to  decline offer 
      }

      let amount = BigInt(state.tokens.highestbidder);
      let bigAmount = BigInt(amount);

      //accept the offer
      let toks = await contract.market_close_bid_generic(
        payload,
        300000000000000,
        0
      );
        Swal.fire({
          title: (option ? t("Detail.swTitOffer-1") : t("Detail.swTitOffer-2")),
          text: (option ? t("Detail.swTxtOffer-1") : t("Detail.swTxtOffer-2")),
          icon: 'success',
        }).then(function () {
          window.location.reload();
        })
  }

  async function comprar() {
    //evitar doble compra
    setstate({ ...state, btnDisabled: true });
    let account, toks;
    if (localStorage.getItem("blockchain") == "0") {
      return
    } else {

      let amount = parseFloat(state.tokens.price);
      //console.log("amount", amount)

      //instanciar contracto
      let payload = {
        nft_contract_id: process.env.REACT_APP_CONTRACT,
        token_id: state.tokens.tokenID
      }
      // let toks = await ext_call(process.env.REACT_APP_CONTRACT_MARKET,"offer",payload,300000000000000,fromNearToYocto(amount))
      const wallet = await selector.wallet();
      
      wallet.signAndSendTransaction({
        signerId: accountId,
        receiverId: process.env.REACT_APP_CONTRACT_MARKET,
        actions: [
          {
            type: "FunctionCall",
            params: {
              methodName: "offer",
              args: payload,
              gas: 300000000000000,
              deposit: fromNearToYocto(amount),
            }
          }
        ]
      }).then(() => {
        Swal.fire({
          background: '#0a0a0a',
          width: '800',
          html:
            '<div class="">' +
            '<div class="font-open-sans  text-base font-extrabold text-white mb-4 text-left uppercase">' +  t("Alerts.buyNFTTit") + '</div>' +
            '<div class="font-open-sans  text-sm text-white text-left">' + t("Alerts.buyNFTMsg") + '</div>' +
            '</div>',
          confirmButtonText: t("Alerts.continue"),
          buttonsStyling: false,
          customClass: {
            confirmButton: 'font-open-sans uppercase text-base  font-extrabold  text-white  text-center bg-yellow2 rounded-md bg-yellow2 px-3 py-[10px] mx-2',
          },
          confirmButtonColor: '#f79336',
          position: window.innerWidth < 1024 ? 'bottom' : 'center'
        }).then((result) => {
          if (result.isConfirmed) {
            window.location.href = "/mynfts"
          }
        });
      }).catch((err) => {
        console.log("error: ", err);
      });
    }
  }

  async function processCancelOffer(tokenID){
    let payload = {
      nft_contract_id: process.env.REACT_APP_CONTRACT,
      token_id: tokenID,
    }
    // ext_call(process.env.REACT_APP_CONTRACT_MARKET,"delete_offer",payload,300000000000000,1)
    const wallet = await selector.wallet();
    wallet.signAndSendTransaction({
      signerId: accountId,
      receiverId: process.env.REACT_APP_CONTRACT_MARKET,
      actions: [
        {
          type: "FunctionCall",
          params: {
            methodName: "delete_offer",
            args: payload,
            gas: 300000000000000,
            deposit: 1,
          }
        }
      ]
    }).then(() => {
      Swal.fire({
        background: '#0a0a0a',
        width: '800',
        html:
          '<div class="">' +
          '<div class="font-open-sans  text-base font-extrabold text-white mb-4 text-left uppercase">' +  t("Alerts.offerCanTit") + '</div>' +
          '<div class="font-open-sans  text-sm text-white text-left">' + t("Alerts.offerCanMsg") + '</div>' +
          '</div>',
        confirmButtonText: t("Alerts.continue"),
        buttonsStyling: false,
        customClass: {
          confirmButton: 'font-open-sans uppercase text-base  font-extrabold  text-white  text-center bg-yellow2 rounded-md bg-yellow2 px-3 py-[10px] mx-2',
        },
        confirmButtonColor: '#f79336',
        position: window.innerWidth < 1024 ? 'bottom' : 'center'
      }).then((result) => {
        if (result.isConfirmed) {
          window.location.href = "/detail/"+props.tokens.tokenID
        }
      });
    }).catch((err) => {
      console.log("error: ", err);
    });
  }

  async function processAcceptOffer(listed,tokenID){
    let contract = await getNearContract();
    let amount = fromNearToYocto(0.01);
    let price = "1"
    console.log(state)
    let msgData = JSON.stringify({market_type:"accept_offer", price: price, title: state.jdata.title, media: state.jdata.image, creator_id: state.jdata.creator, description: state.jdata.description})
    let payload = {
      token_id: state.tokens.tokenID,
      account_id: process.env.REACT_APP_CONTRACT_MARKET,
      msg: msgData
    }
    console.log(payload)
    // let acceptOffer = contract.nft_approve(
    //   payload,
    //   300000000000000,
    //   amount
    // )
    const wallet = await selector.wallet();
    wallet.signAndSendTransaction({
      signerId: accountId,
      receiverId: process.env.REACT_APP_CONTRACT,
      actions: [
        {
          type: "FunctionCall",
          params: {
            methodName: "nft_approve",
            args: payload,
            gas: 300000000000000,
            deposit: amount,
          }
        }
      ]
    }).then(() => {
      Swal.fire({
        background: '#0a0a0a',
        width: '800',
        html:
          '<div class="">' +
          '<div class="font-open-sans  text-base font-extrabold text-white mb-4 text-left uppercase">' +  t("Alerts.acceptOffTit") + '</div>' +
          '<div class="font-open-sans  text-sm text-white text-left">' + t("Alerts.acceptOffMsg") + '</div>' +
          '</div>',
        confirmButtonText: t("Alerts.continue"),
        buttonsStyling: false,
        customClass: {
          confirmButton: 'font-open-sans uppercase text-base  font-extrabold  text-white  text-center bg-yellow2 rounded-md bg-yellow2 px-3 py-[10px] mx-2',
        },
        confirmButtonColor: '#f79336',
        position: window.innerWidth < 1024 ? 'bottom' : 'center'
      }).then((result) => {
        if (result.isConfirmed) {
          window.location.reload()
        }
      });
    }).catch((err) => {
      console.log("error: ", err);
    });
  }

  async function makeAnOffer() {
    console.log("Make a offer")
    setOfferModal({
      ...state,
      show: true,
      title: t("Detail.modalMakeBid"),
      message: t("Detail.modalMsg"),
      loading: false,
      disabled: false,
      change: setOfferModal,
      buttonName: 'X',
      tokenId: 'hardcoded'
    })
  }

  async function makeAddToken(){
    console.log("Add token to collection")
    setAddTokenModal({
      ...state,
      show: true,
      title: t('Detail.msgAddToken'),
      message: t('Detail.msgAddToken2'),
      loading: false,
      disabled: false,
      change: setAddTokenModal,
      buttonName: 'X',
      tokenId: 'hardcoded'
    })
  }
  //setting state for the offer modal
  const [offerModal, setOfferModal] = useState({
    show: false,
  });

  const [addTokenModal, setAddTokenModal] = useState({
    show: false,
  });
  return (
    <>
      <section className="text-white body-font overflow-hidden dark:bg-darkgray font-open-sans">
        <div className="container px-5 py-8 mx-auto">
          <div
            className="regresar"
          >
            <a href={'/mynfts'} >
              <img
                className="hover:cursor-pointer h-[50px] "
                src={flechaiz}
                alt='flecha'
              />
            </a>
          </div>
          <div className="lg:w-4/5 mx-auto flex flex-wrap">
            <div className="lg:w-1/2 w-full lg:h-auto h-64 flex">
              <img
                alt="ecommerce"
                className=" object-contain md:object-scale-down rounded-xlarge shadow-yellow2 lg:h-auto h-64 w-auto m-auto"
                src={loadInfo ? `https://nativonft.mypinata.cloud/ipfs/${state?.jdata.image}` : loadingGif}
              />
            </div>
            
            <div className="lg:w-1/2 w-full lg:pl-10 lg:mt-0">

              <h1 className="text-white text-3xl title-font font-bold mb-3 font-raleway">
                {state?.jdata.title}
              </h1>
              <p className="leading-relaxed mt-2 mb-3 font-raleway font-medium ">
                {state?.jdata.description}
              </p>

              {creator ? 
                noCollection ?
                <div className="relative group rounded-xlarge">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-[#f2b159] to-[#ca7e16] rounded-full blur opacity-70 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt group-hover:-inset-1"></div>
                  <button
                    className={"relative w-full content-center uppercase justify-center text-center font-bold text-white bg-yellow2 py-2 px-6 rounded-xlarge font-raleway"}
                    onClick={async () => {
                      makeAddToken()
                    }}>
                      {t('Detail.msgAddToken')}
                    </button>
                </div>
                :
                ""
              :
              ""
              }
              
              <div
                className={`mt-4 flex py-2 px-2 my-2 bg-gray-50 rounded-xlarge`}
                >
                <span className="text-black pl-3 font-bold text-sm uppercase font-raleway ">Token Id</span>
                <span className="ml-auto text-gray-900  text-sm pr-3 font-raleway font-medium">
                  {state?.tokens.tokenID}
                </span>
              </div>

              {state?.tokens.sale?
                <>
                  <div
                    className={`flex py-2 px-2 my-2 bg-gray-50 rounded-xlarge`}
                  >
                      <span className="text-black pl-3 font-bold uppercase font-raleway  text-sm">{t("Detail.sale")}</span>
                      <span className="ml-auto text-gray-900 pr-3">
                        <span
                          className={`inline-flex items-center justify-center px-2 py-1  font-raleway font-medium text-xs leading-none ${state?.tokens.sale
                            ? "text-green-100 bg-green-600"
                            : "text-red-100 bg-red-600"
                            } rounded-full`}
                        >
                          {state?.tokens.sale ? t("Detail.available-1") : t("Detail.available-2")}
                        </span>
                      </span>
                    </div>
                </>
              :
                ""}
              {/*<div
                className={`flex border-l-4 border-${props.theme}-500 py-2 px-2 my-2 bg-gray-50`}
              >
                <span className="text-gray-500">Tags</span>
                <span className="ml-auto text-gray-900">
                  {
                    state?.jdata.tags.length > 0 ?
                      state?.jdata.tags.map((element) =>
                        <span
                          key={element}
                          className={`inline-flex items-center justify-center px-2 py-1 ml-2 text-xs font-bold leading-none ${state?.jdata.tags
                            ? "text-green-100 bg-green-500"
                            : "text-red-100 bg-red-500"
                            } rounded-full`}
                        >
                          {element}
                        </span>
                      ) : null
                  }

                </span>
              </div>*/}



              <div
                className={`flex py-2 px-2 my-2 bg-gray-50 rounded-xlarge`}
              >
                <span className="text-black pl-3 font-bold uppercase font-raleway text-sm text-ellipsis overflow-hidden">{t("Detail.owner")}</span>
                <a className="ml-auto" href={"/profile/"+state?.owner.split('.')[0]}><span className="ml-auto text-gray-900 font-semibold pr-3 font-raleway text-sm">
                  {state?.owner.split('.')[0].length > 15 ? state?.owner.split('.')[0].substr(0,15)+'.'+state?.owner.split('.')[1] : state?.owner.split('.')[0]+'.'+state?.owner.split('.')[1]}
                </span></a>
              </div>

              <div
                className={`flex py-2 px-2 my-2 bg-gray-50 rounded-xlarge`}
              >
                <span className="text-black pl-3 font-bold uppercase font-raleway text-sm text-ellipsis overflow-hidden">{t("Detail.creator")}</span>
                <a className="ml-auto" href={"/profile/"+state?.jdata.creator.split('.')[0]}><span className="ml-auto text-gray-900 font-semibold pr-3 font-raleway text-sm">
                  {state?.jdata.creator.split('.')[0].length > 15 ? state?.jdata.creator.split('.')[0].substr(0,15)+'.'+state?.jdata.creator.split('.')[1] : state?.jdata.creator.split('.')[0]+'.'+state?.jdata.creator.split('.')[1]}
                </span></a>
              </div>

              {(hasRoyalty ?
                <div
                  className={`flex py-2 px-2 my-2 bg-gray-50 rounded-xlarge`}
                >
                  <span className="text-black pl-3 font-bold uppercase font-raleway text-sm">{t("Detail.royalty")}</span>
                  <span className="ml-auto text-gray-900 font-semibold pr-3 text-right font-raleway text-sm">
                    <ol>
                      {state?.jdata.royalty.map((data,i) => {
                        return(
                          <li key={i}>{data[0]} : {(data[1]/100)}%</li>
                        )
                      })}
                    </ol>
                  </span>
                </div>
                : "")
              }
              {(hasBids ?
                <>
                <div className="grid grid-rows-2 py-2 px-2 bg-gray-50 rounded-xlarge">
                  <div className="grid grid-cols-2 mb-2">
                    <span className="text-black pl-3 font-bold uppercase font-raleway text-sm">{t("Detail.actualBid")} {state?.tokens.bidPrice} NEAR</span>
                    <span className="ml-auto text-gray-900 font-semibold pr-3 font-raleway text-sm">{state?.tokens.bidder}</span>
                  </div>
                  {(state?.tokens.bidder == state?.tokens.account ? 
                    <div className="w-full relative group rounded-xlarge">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-[#f2b159] to-[#ca7e16] rounded-full blur opacity-70 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt group-hover:-inset-1"></div>
                      <button 
                        className="relative w-full bg-yellow2 rounded-xlarge uppercase content-center justify-center text-center font-bold text-white border-0 py-1 px-6 ml-auto font-raleway text-sm"
                        onClick={async () => {processCancelOffer(state?.tokens.tokenID)}}>
                          <span className="font-raleway">{t("Detail.cancelBid")}</span>
                      </button>
                    </div>
                    : state?.tokens.account == state?.owner ?
                      <>
                        <div className="w-full relative group rounded-xlarge">
                          <div className="absolute -inset-0.5 bg-[#5aee8c]  rounded-xlarge blur opacity-70 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt group-hover:-inset-1"></div>
                          <button 
                            className="relative w-full bg-green-500 rounded-xlarge uppercase content-center justify-center text-center font-bold text-white border-0 py-1 px-6 ml-auto font-raleway text-sm"
                            onClick={async () => {processAcceptOffer(state?.tokens.sale,state?.tokens.tokenID)}}>
                            <span className="font-raleway">{t("Detail.accept")}</span>
                          </button>
                        </div>
                      </>
                    : "")
                    }
                </div>
                </> 
                : "")
              }
              

   
              {/* <div
                className={`flex border-l-4 border-${props.theme}-500 py-2 px-2 my-2 bg-gray-50 invisible`}
              >
                <span className="text-gray-500">Contrato</span>
                <span className="ml-auto text-gray-900 text-xs">
                  {state?.jdata.contract}
                </span>
              </div> */}




              

              <div className="flex mt-6 items-center pb-5 border-b-2 border-gray-100 mb-5"></div>

              <div className="flex flex-col">
                <span className="title-font font-medium text-2xl text-white text-center w-full font-open-sans ">
                  { 
                    !state?.tokens.sale ?
                      ""
                      :
                       + state?.tokens.price + " " + currencys[parseInt(localStorage.getItem("blockchain"))]
                  }
                </span>
                <div className="flex flex-row flex-wrap justify-around mt-3 text-center">
                  {
                    stateLogin? 
                    state?.owner != state?.ownerAccount? 
                      <>
                      <div className="w-full my-4 lg:w-40 relative group rounded-xlarge">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-[#f2b159] to-[#ca7e16] rounded-full blur opacity-70 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt group-hover:-inset-1"></div>
                        <button
                          className={`content-center justify-center text-center text-white bg-yellow2 border-0 py-2 px-6 rounded-xlarge font-raleway font-bold uppercase relative w-full`}
                          onClick={async () => {
                            makeAnOffer();
                          }}
                        >
                          {t("Detail.bid")}
                        </button>
                      </div>
                        
                        {state?.tokens.sale ? 
                        <>
                        <div className="w-full my-4 lg:w-40 relative group rounded-xlarge">
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#f2b159] to-[#ca7e16] rounded-full blur opacity-70 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt group-hover:-inset-1"></div>
                          <button
                            className={`content-center justify-center text-center text-white bg-yellow2 border-0 py-2 px-6 rounded-xlarge font-raleway font-bold uppercase relative w-full`}
                            onClick={async () => {
                              comprar();
                            }}
                          >
                            {t("Detail.buy")}
                          </button>
                        </div>
                        </> : ""}
                      </>
                      : "" 
                      : 
                      <button
                        className={`flex ml-auto mt-2 text-white bg-yellow2 border-0 py-2 px-6 focus:outline-none  rounded-xlarge font-raleway font-medium`}
                        style={
                          btn
                            ?
                            { width: "100%", justifyContent: "center" }
                            :
                            {}
                        }
                        // disabled={state?.tokens.onSale}
                        onClick={handleSignIn}
                      >
                        {t("Detail.login")}
                      </button>
                  }

                
                </div>
              </div>
            </div>

            {/*//CURRENT OFFER TO i 
            state  && state.tokens && state.tokens.addressbidder != 'accountbidder' &&  state.tokens.highestbidder != "notienealtos" ?
            <div className="w-full">
              <div className="w-full border-4 rounded-lg border-[#eab308] border-white-500 mt-10">
                <div className="text-center p-2 bg-[#eab308] text-white font-bold text-xl">{t("Detail.curBid")}</div>
                <div className="w-full flex flex-row py-1 justify-between text-gray-500 bg-gray-50">
                  <div className="w-6/12 md:w-4/12 text-center  text-lg font-bold text-gray-500">{t("Detail.bidder")}</div>
                  <div className="w-6/12 md:w-4/12 text-center  text-lg font-bold text-gray-500">{t("Detail.price")}</div>
                  <div className="w-0 md:w-4/12 text-center  text-lg font-bold text-gray-500"></div>
                </div>
                  <div className=" w-full h-[75px] md:h-[50px] overscroll-none">
                    <div className={`w-full flex flex-row  flex-wrap justify-around md:justify-between py-2 border-b-4 border-gray-50`}>
                      <div className="w-4/12 text-center text-gray-500">{state?.tokens.addressbidder}</div>
                      <div className="w-4/12 text-center text-gray-500">{state?.tokens.highestbidder ? fromYoctoToNear(state?.tokens.highestbidder) : ""} NEAR</div>
                      <div className="w-full md:w-4/12 text-center text-gray-500 flex justify-around">
                        { state.owner == state.ownerAccount ? 
                        <button
                          onClick={async () => {
                            manageOffer(true);
                          }}
                        >
                          <span
                            className={`inline-flex items-center justify-center px-6 py-2  text-xs font-bold leading-none  text-green-100 bg-green-500 rounded-full`}
                          >
                            {t("Detail.accept")}
                          </span>
                        </button> : ""
                        }
                        { state.owner == state.ownerAccount || state.ownerAccount == state.tokens.addressbidder ? 
                        <button
                          onClick={async () => {
                            manageOffer(false);
                          }}
                        >
                          <span
                            className={`inline-flex items-center justify-center px-6 py-2  text-xs font-bold leading-none text-red-100 bg-red-500 rounded-full` } 
                          >
                            {t("Detail.decline")}
                          </span>
                        </button> : ""
                          }
                      </div>
                    </div>
                  </div>
              </div>
            </div>
            : ""
            */}
            {/*state && state.toknOffersData != 0 ?
              <div className="w-full border-4 rounded-lg border-[#eab308] border-white-500 mt-10">
                <div className="text-center p-2 bg-[#eab308] text-white font-bold text-xl">{t("Detail.bidsMade")}</div>
                <div className="w-full flex flex-row py-1 justify-between text-gray-500 bg-gray-50">
                  <div className="w-4/12 text-center  text-lg font-bold text-gray-500">{t("Detail.bidder")}</div>
                  <div className="w-4/12 text-center  text-lg font-bold text-gray-500">{t("Detail.price")}</div>
                </div>
                <div className="h-[250px] overflow-scroll">
                  {state?.toknOffersData.map((offer, i) => {
                    return (
                      <div key={i} className={`w-full flex flex-row justify-between py-2 border-b-4 border-gray-50`}>
                        <div className="w-4/12 text-center text-gray-500">{offer.owner_id}</div>
                        <div className="w-4/12 text-center text-gray-500">{fromYoctoToNear(offer.price)} NEAR</div>
                      </div>
                    );
                  })
                  }
                </div>
              </div>
              : ""
                */}
          </div>


        </div>
        <OfferModal {...offerModal}  />
        <AddTokenModal {...addTokenModal} />
      </section>
    </>
  );
}

LightEcommerceB.defaultProps = {
  theme: "yellow",
};

LightEcommerceB.propTypes = {
  theme: PropTypes.string.isRequired,
};

export default LightEcommerceB;
