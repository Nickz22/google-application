/*
*
*@Concern Services - Packaging
*
*/
// 
export class CardContentWrapper{
    constructor(content){ // handles FeedItem, Task and Event
        this.RecordId = content.Id;
        this.Body = content.Description ? content.Description : null;
        this.Subject = content.Subject ? content.Subject : null;
        this.CreatedDate = content.CreatedDate.substring(0, content.CreatedDate.indexOf('T')); // parse s,m,h out of datetime
        this.Type = content.Id.substring(0,3) == "0D5" ? "FeedItem" : "Activity";
        this.IconName = content.Id.substring(0,3) == "0D5" ? "standard:opportunity" : (content.Id.substring(0,3) == "00T" ? "standard:task" : "standard:event");
        this.TrackedChanges = content.FeedTrackedChanges ? content.FeedTrackedChanges : null;
        this.ParentId = content.Parent ? content.Parent.Id : content.WhatId;
        this.Parent = content.Parent;
        this.What = content.What;
        this.WhatIdIconName = (content.WhatId && content.WhatId.substring(0,3)) == "001" ? "standard:account" : "standard:opportunity";
        this.Who = content.Who;
        this.Status = content.Status ? content.Status : null;
        this.StartTime = content.StartDateTime ? content.StartDateTime.substring(content.StartDateTime.indexOf('T')+1, (content.StartDateTime.length-9)) : null;
        this.EndTime = content.EndDateTime ? content.EndDateTime.substring(content.EndDateTime.indexOf('T')+1, (content.EndDateTime.length - 9)) : null;
    }
}

export class DateGroupedContent{
    constructor(date, wrappers){
        this.Date = date;
        this.Wrappers = wrappers;
    }
}   

export class recordWrapper{
    constructor(record, mapFieldApiNameToLabel){
        this.record = record;
        this.mapFieldApiNameToLabel = mapFieldApiNameToLabel;
        this.fieldValues = [];
    }
    getFieldValues(){
        for(let field in this.mapFieldApiNameToLabel){
            let navFieldApiName = this.mapFieldApiNameToLabel[field]['link'];
            if(field.includes('__r') || field.includes('.')){
                let spanningFieldSegments, relationship, spanningField;
                spanningFieldSegments = field.split('.');
                relationship = spanningFieldSegments[0];
                spanningField = spanningFieldSegments[1];
                if(this.record[relationship]==null){
                    this.fieldValues.push({value: '', link: false})
                    continue;
                }
                this.fieldValues.push({
                    value: relationship ? this.record[relationship][spanningField] : this.record[field],
                    link: navFieldApiName == '' ? false : this.record[navFieldApiName]
                });
            }else if(this.record[field] && this.record[field].includes('www.')){
                this.fieldValues.push({
                    value: this.record[field],
                    link: this.record[field]
                })
            }else{
                this.fieldValues.push({value: this.record[field] == null ? '' : this.record[field], link: navFieldApiName == '' ? false : this.record[navFieldApiName]})
            }
        }
        return this.fieldValues;
    }
}

/*
*
*@Concern Services - Methods
*
*/

export function fireEvent(component, name, body, bubble, compose){
    component.dispatchEvent(new CustomEvent(name, {
        detail : body,
        bubbles : bubble,
        composed : compose
    }))
}

export function sortRows(headerLabel, mapFieldApiNameToLabel, unsortedRecordList, sortOrder){
    let apiName;
    for(let fieldApiName in mapFieldApiNameToLabel){
        if(mapFieldApiNameToLabel[fieldApiName].label.toLowerCase() == headerLabel.toLowerCase()){
            apiName = fieldApiName;
            break;
        }
    }
    // switch out record for paginated records
    let sortedRecords = JSON.parse(unsortedRecordList).sort((a,b) => {
        let aFieldVal, bFieldVal;
        let comparison = 0;
        if(apiName.includes('__r') || apiName.includes('.')){
            let spanningFieldSegments = apiName.split('.');
            let relationship = spanningFieldSegments[0];
            let spanningField = spanningFieldSegments[1];
            if(a.record[relationship]) aFieldVal = a.record[relationship][spanningField].toLowerCase();
            if(b.record[relationship]) bFieldVal = b.record[relationship][spanningField].toLowerCase();
        }else{
            if(a.record[apiName])
                aFieldVal = (a.record[apiName].includes('.') ? a.record[apiName].substring(0, a.record[apiName].indexOf('.')).toLowerCase() : aFieldVal = a.record[apiName].toLowerCase());
            if(b.record[apiName])
                bFieldVal = (b.record[apiName].includes('.') ? b.record[apiName].substring(0, b.record[apiName].indexOf('.')).toLowerCase() : bFieldVal = b.record[apiName].toLowerCase());
        }
        if(aFieldVal > bFieldVal || typeof aFieldVal == 'undefined'){
            comparison = 1;
        }else if(bFieldVal > aFieldVal || typeof bFieldVal == 'undefined'){
            comparison = -1;
        }
       return (sortOrder == 'desc' ? comparison : comparison * -1);
    })
    return sortedRecords;
}

export function updateUsageDataEvents(currentEvents, newEvent){
    if(currentEvents.toLowerCase().includes(newEvent.toLowerCase())){
        return currentEvents;
    }else{
        return currentEvents+newEvent+';';
    }
}

export function getErrorMessage(error){
    let errorMessage;
    if(error.message){
        return error.message;
    }
    if(error.body && error.body.output && (error.body.output.errors || error.body.output.fieldErrors)){
        if(error.body.output.errors){
            for(let x in error.body.output.errors){
                errorMessage = error.body.output.errors[x].message;
            }
        }
        if(error.body.output.fieldErrors){
            for(let x in error.body.output.fieldErrors){
                if(x.toLowerCase() != "statuscode"){
                    errorMessage = error.body.output.fieldErrors[x][0].message;
                }
            }
        }
        if(!errorMessage){
            errorMessage = error.body.message;
        }
        return errorMessage ? errorMessage : "no error message found in error object";
    }
}

export function getMapFromArray(paramKey, array, stringifyKey){
    let aMap = new Map();
    for(let i = 0; i<array.length; i++){
        aMap.set(stringifyKey ? JSON.stringify(array[i][paramKey]) : array[i][paramKey], array[i]);
    }
    return aMap;
}

export function log(message){
    console.log(message);
}

export function toggleClass(el, classes){
    for(let i = 0; i < classes.length; i++){
        el.classList.toggle(classes[i]);
    }
}