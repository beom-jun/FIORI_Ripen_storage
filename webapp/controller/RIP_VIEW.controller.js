sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter"
], function (Controller, JSONModel, Filter) {
    "use strict";

    return Controller.extend("ripeninig.ripeninig.controller.RIP_VIEW", {
        onInit: async function () {
            await this.onCurrweather();
            
            const oModel = this.getView().getModel();
            const aPlants = [];
            const plantSet = new Set();

            oModel.read("/RipStorage_view", {
                success: (oData) => {
                    const aCleaned = this._cleanRipeningData(oData.results);
                    // const aSorted = [...aCleaned].sort((a, b) => new Date(a.Datbi) - new Date(b.Datbi));

                    aCleaned.forEach((data) => {
                        if (!plantSet.has(data.Werks)) {
                            plantSet.add(data.Werks);

                            //plant 번호 대신 지역 이름으로 설정
                            let label = "";
                            switch (data.Werks) {
                                case "P2000": label = "P2000 - 충청 숙성창고"; break;
                                case "P3000": label = "P3000 - 경상 숙성창고"; break;
                                case "P4000": label = "P4000 - 전라 숙성창고"; break;
                                default: label = data.Werks;
                            }

                            aPlants.push({ key: data.Werks, text: label });
                        }
                    });

                    this.getView().setModel(new JSONModel(aPlants), "werksModel");
                    this.getView().setModel(new JSONModel(), "resultModel");
                    this.getView().setModel(new JSONModel({ selectedWerks: "" }), "viewModel");
                    this.getView().setModel(new JSONModel(aCleaned), "ripeningModel"); // 차트용 모델

                    if (aPlants.length > 0) {
                        const sDefault = aPlants[0].key;
                        this.getView().getModel("viewModel").setProperty("/selectedWerks", sDefault);

                        this.onPlantChange({
                            getSource: () => ({
                                getSelectedKey: () => sDefault
                            })
                        });
                    }
                },
                error: (oError) => {
                    console.error("초기 데이터 호출 실패:", oError);
                }
            });
        },
        //open wether API 받아옴
        onCurrweather: async function (sWerks) {
            const locationMap = {
                "P2000": { lat: 36.3504, lon: 127.3845, name: "충청 숙성창고" },
                "P3000": { lat: 35.1595, lon: 126.8526, name: "전라 숙성창고" }, 
                "P4000": { lat: 35.8714, lon: 128.6014, name: "경상 숙성창고" } 
            };

            const location = locationMap[sWerks] || locationMap["P2000"];

            try {
                const url = `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lon}&units=metric&lang=kr&appid=613ac7d721406d59cec6506314044e4a`;
                const response = await fetch(url);
                const data = await response.json();

                const tempMax = Math.round(data.main.temp_max);
                const tempMin = Math.round(data.main.temp_min);
                const currentTemp = Math.round(data.main.temp);
                const humidity = Math.round(data.main.humidity);

                this.byId("txtTempMax").setText(`${tempMax}°C`);
                this.byId("txtTempMin").setText(`${tempMin}°C`);
                this.byId("txtTempCurr").setText(`${currentTemp}°C`);
                this.byId("txtHumidity").setText(`${humidity}%`);

            } catch (error) {
                console.error("날씨 호출 실패:", error);
            }
        },
        //Werks를 기준으로 plant 렌더링 다르게
     onPlantChange: function (oEvent) {

        const sWerks = oEvent.getSource().getSelectedKey();
        const oModel = this.getView().getModel();

        const aFilter = [new Filter("Werks", "EQ", sWerks)];

        oModel.read("/RipStorage_view", {
            filters: aFilter,
            success: (oData) => {
                const cleanedData = this._cleanRipeningData(oData.results);

                // 최신 데이터 기준: 마지막 항목 사용
                const latestEntry = cleanedData[cleanedData.length - 1];
                this.getView().getModel("resultModel").setData(latestEntry);

                // 차트용 전체 데이터도 갱신
                this.getView().getModel("ripeningModel").setData(cleanedData);

                // 상태 업데이트
                this.onWaring(latestEntry.Tempe, latestEntry.Humid);
                this.onCurrweather(sWerks);

                // 지도 좌표 설정 (sWerks 기준)
                const locationMap = {
                                    "P2000": {
                            lat: 36.9350, lon: 126.7790,
                            name: "충청 숙성창고",
                            address: "충남 당진시 송악읍 명산리 1320-1",
                            phone: "041-555-7777",
                            image: "/img/storage1.png"
                        },
                        "P3000": {
                            lat: 35.8714, lon: 128.6014,
                            name: "경상 숙성창고",
                            address: "대구 수성구 달구벌대로 321",
                            phone: "053-555-9999",
                            image: "/img/storage2.png"
                        },
                        "P4000": {
                            lat: 35.1595, lon: 126.8526,
                            name: "전라 숙성창고",
                            address: "광주 서구 상무자유로 123",
                            phone: "062-555-8888",
                            image: "/img/storage3.png"
                        }
                        
                    };

            const location = locationMap[sWerks] || { lat: 37.5665, lon: 126.9780, name: "서울" };
            const sMapUrl = `https://maps.google.com/maps?q=${location.lat},${location.lon}&z=15&output=embed`;
            const sIframe = `<iframe width="500" height="400" style="border:0;" loading="lazy" allowfullscreen src="${sMapUrl}"></iframe>`;
            const oHtml = new sap.ui.core.HTML({ content: sIframe });

            // set image:
            // const sImageUrl = sap.ui.require.toUrl("img/storage1.png");
            // this.byId("storageImage").setSrc(sImageUrl);

            // set image:
            // const sAppRootPath = jQuery.sap.getModulePath("ripeninig.ripeninig"); // manifest.json의 sap.app.id 기준
            // const sImageUrl = sAppRootPath + location.image;
            // this.byId("storageImage").setSrc(sImageUrl);
            const sAppRootPath = jQuery.sap.getModulePath("ripeninig.ripeninig");  
            const sImageUrl = sAppRootPath + location.image;
            this.byId("storageImage").setSrc(sImageUrl);

            const oVBox = this.byId("mapContainer");
            oVBox.removeAllItems();
            oVBox.addItem(oHtml);
            
            // 창고 정보 표시
            // this.byId("storageImage").setSrc(location.image);
            this.byId("storageAddress").setText("창고위치 : " + location.address);
            this.byId("storagePhone").setText("전화번호 : " + location.phone);

            // 지도 상단 타이틀 설정 (옵션)
            const oMapTitle = this.byId("mapTitle");
            if (oMapTitle) {
                oMapTitle.setText(location.name);
            }
                    },
                    error: (err) => {
                        console.error("플랜트 데이터 호출 실패:", err);
                    }
                });
            },

        //list box로 plant 선택 시 정보들 변환
        onComboChange: function (oEvent) {

            const sInputValue = oEvent.getSource().getValue();
            const aPlantList = this.getView().getModel("werksModel").getData();
            const bExists = aPlantList.some(plant => plant.key === sInputValue);

            if (bExists) {
                this.getView().getModel("viewModel").setProperty("/selectedWerks", sInputValue);

                this.onPlantChange({
                    getSource: () => ({
                        getSelectedKey: () => sInputValue
                    })
                });
            }
        },
        //숙성창고 테이블 데이터터
        onStorage: function () {
            const oModel = this.getView().getModel(),
                oTable = this.getView().byId('DocuTable'),
                aIndex = oTable.getSelectedIndices(),
                oContext = oTable.getContextByIndex(aIndex[0]),
                oData = oContext.getObject();

            this.byId('Stlno').setValue(oData.Stlno);
            this.byId('Stltype').setValue(oData.Stltype);
            this.byId('Werks').setValue(oData.Werks);
            this.byId('Matnr').setValue(oData.Matnr);
            this.byId('Tempe').setValue(oData.Tempe);
            this.byId('Humid').setValue(oData.Humid);
            this.byId('Dpose').setValue(oData.Dpose);
            this.byId('Batno').setValue(oData.Batno);
            this.byId('Datbi').setValue(oData.Datbi);
            this.byId('Temptime').setValue(oData.Temptime);

            this.onWaring(oData.Tempe, oData.Humid);
        },
        //주의요망 부분인데 수정 필요
        onWaring: function (currentTemp, humidity) {
            const oText = this.byId("WarningText");
            const oIcon = this.byId("WarningIcon");
        
            // 기본 상태 초기화
            oText.setText("양호");
            oText.removeStyleClass("dangerText");
            oText.addStyleClass("safeText");
        
            oIcon.setSrc("sap-icon://status-positive"); // 초록색 느낌의 아이콘
            oIcon.removeStyleClass("dangericon");
            oIcon.addStyleClass("safeicon");
        
            // 조건 충족 시 경고 상태로 전환
            if (currentTemp >= 5 || humidity >= 90) {
                oText.setText("주의요망!");
                oText.removeStyleClass("safeText");
                oText.addStyleClass("dangerText");
        
                oIcon.setSrc("sap-icon://alert");
                oIcon.removeStyleClass("safeicon");
                oIcon.addStyleClass("dangericon");
            }
        },
        // 날짜, 시간 타입 변경
        _cleanRipeningData: function (aData) {
            return aData.map(item => {
                item.Dpose = Number(item.Dpose || 0);
                item.Tempe = Number(item.Tempe || 0);
        
                // 날짜 문자열로 변환환
                if (item.Datbi) {
                    const date = new Date(item.Datbi);
                    const yyyy = date.getFullYear();
                    const mm = String(date.getMonth() + 1).padStart(2, '0');
                    const dd = String(date.getDate()).padStart(2, '0');
                    item.Datbi = `${yyyy}-${mm}-${dd}`;
                }
        
                // 시간 문자열로 변경
                if (typeof item.Temptime === "object" && item.Temptime.ms) {
                    const dateObj = new Date(item.Temptime.ms);
                    const hours = String(dateObj.getHours()).padStart(2, '0');
                    const mins = String(dateObj.getMinutes()).padStart(2, '0');
                    item.Temptime = `${hours}:${mins}`;
                } else if (typeof item.Temptime === "string" && item.Temptime.length === 6) {
                    const hours = item.Temptime.substring(0, 2);
                    const mins = item.Temptime.substring(2, 4);
                    item.Temptime = `${hours}:${mins}`;
                }
        
                return item;
            });
        }
    });
});