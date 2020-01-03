import { LightningElement, track, api} from 'lwc';
import {log, toggleClass, CardContentWrapper, DateGroupedContent} from 'c/lwcUtil';
import getChatterPosts from '@salesforce/apex/AccountTeamComponentController.getChatterPosts';
import getAccountTeam from '@salesforce/apex/AccountTeamComponentController.getAccountTeam';
import getMemberActivities from '@salesforce/apex/AccountTeamComponentController.getMemberActivities';

export default class accountTeamRelatedList extends LightningElement {
    @api recordId;
    @track postFilterToggle = true;
    @track addAccountTeamMembers = false;
    @track accountTeam = [];
    @track chatterBtnLabel = 'Member Actions';
    @track chatterSize = 0;
    @track overlay = "";
    @track iconName ="";
    @track userIdToName = new Map();
    @track toggleLabel = '';
    @track filteredActivities = [];
    @track filteredPosts = [];
    // dom elements
    @track memberSection;
    @track publisher;
    @track publisherHeader;
    @track toggleDiv;
    @track lightningCards = [];
    @track filteredUserName = 'all users';
    @track postCreatedDate;
    @track postDateClassName = 'slds-hidden slds-text-color_inverse-weak post-date';
    groupedTrackedChanges = new Map(); // MAP user id => list of chatter changes
    groupedTeamActivities = new Map(); // MAP user id => list of activities
    filteredTrackedChanges = []; // ARRAY clicked user tracked changes 
    filteredActivities = []; // ARRAY clicked user activities
    chatterPosts = [];
    activities = [];
    userIdToAvatar = new Map();
    currentIconId;

    connectedCallback(){
        this.getData();
    }

    renderedCallback(){
        // get elements for later referencing to bypass shadow dom
        this.memberSection = this.template.querySelector("[data-id=members]");
        this.publisher = this.template.querySelector("[data-id=publisher]");
        this.publisherHeader = this.template.querySelector("[data-id=publisher-header]");
        this.memberDivs = this.template.querySelectorAll('.member-detail');
        this.toggleDiv = this.template.querySelector('.toggle');
        let avatars = this.template.querySelectorAll('lightning-avatar');
        for( let i = 0; i < avatars.length; i++ ){
            this.userIdToAvatar.set(avatars[i].dataset.id, avatars[i]);
        }
    }

    getData = async() => {
        try{
            let chatterPosts = await getChatterPosts({"accountId" : this.recordId});
            this.processPosts(chatterPosts);
            let acctTeam = await getAccountTeam({"accountId" : this.recordId});
            this.processMembers(acctTeam);
            let acctTeamActivities = await getMemberActivities({"accountId" : this.recordId});
            this.processActivities(JSON.parse(acctTeamActivities));
        }catch(error){
            console.error(error.message);
        }
    }

    processPosts = posts => {
        for( let i = 0; i<posts.length; i++ ){
            this.constructDateGroupedPosts(posts[i]);
        }
        this.packagePostGrouping();
    }

    constructDateGroupedPosts = post => {
        let createDate = this.getDateFromDateTime(post.CreatedDate);
        if( this.groupedTrackedChanges.has( post.CreatedById )){ // add post to existing grouping
            let dateGroupedPosts = this.groupedTrackedChanges.get(post.CreatedById);
            if(dateGroupedPosts.has(createDate)){
                let dateGroup = dateGroupedPosts.get(createDate);
                dateGroup.push(new CardContentWrapper(post));
                dateGroupedPosts.set(createDate, dateGroup); 
            }else{
                dateGroupedPosts.set(createDate, [new CardContentWrapper(post)]); 
            }
            this.groupedTrackedChanges.set(post.CreatedById, dateGroupedPosts);
        }else{ // create new grouping
            this.groupedTrackedChanges.set( post.CreatedById, new Map( [[createDate, [new CardContentWrapper(post)]]] ) );
        }
    }

    packagePostGrouping = () => {
        for( const [userId, dateGroupedPosts] of this.groupedTrackedChanges.entries() ){
            let mapDateGroupedPosts = this.groupedTrackedChanges.get(userId);
            let wrappers = [];
            for( const [date, thisDayPosts] of mapDateGroupedPosts ){
                wrappers.push(new DateGroupedContent(date, thisDayPosts));
            }
            this.groupedTrackedChanges.set(userId, wrappers);
        }
    }

    processMembers = members => {
        for(let x = 0; x<members.length; x++){
            this.userIdToName.set(members[x].UserId, members[x].User.Name);
            this.accountTeam.push(members[x]);
        }
    }

    processActivities = userGroupedActivities => {
        let dateGroups = [];
       for ( let userId in userGroupedActivities ){
           dateGroups = [];
           let mapDateGroupedActivities = new Map();
           for( let type in userGroupedActivities[userId] ){
               for( let i = 0; i < userGroupedActivities[userId][type].length; i++ ){
                   let activityDate = this.getDateFromDateTime(userGroupedActivities[userId][type][i].CreatedDate);
                    if( mapDateGroupedActivities.has(activityDate) ){
                        let thisDayActivities = mapDateGroupedActivities.get(activityDate);
                        thisDayActivities.push(new CardContentWrapper(userGroupedActivities[userId][type][i]));
                        mapDateGroupedActivities.set(activityDate, thisDayActivities);
                    }else{
                        mapDateGroupedActivities.set(activityDate, [new CardContentWrapper(userGroupedActivities[userId][type][i])]);
                    }
               }
           }
           for( const [ date, activities ] of mapDateGroupedActivities.entries() ){
                dateGroups.push(new DateGroupedContent(date, activities));
           }
           this.groupedTeamActivities.set(userId, dateGroups);
       }
    }

    filterPostsByUser = event => {
        this.userClickedActions(event);
        let int = setInterval( ( userId, avatar ) => {
            if( this.publisher.classList.contains('chatter-publisher-open') && this.userIdToName.get(userId) == this.filteredUserName ){ // open --> closed activities/chatter modal
                this.doIconClickActions(userId,avatar);
                this.template.querySelector('.toggle').classList.add('slds-hidden');
            }else if( this.publisher.classList.contains('chatter-publisher-init') ){ // closed --> open activities/chatter modal]
                this.openMemberActivities(avatar);
                this.template.querySelector('.toggle').classList.remove('slds-hidden');
            }else if ( this.publisher.classList.contains('chatter-publisher-open') ){
                this.deselectIcon();
                toggleClass(avatar, ['avatar-selected']);
            }
            this.currentIconId = userId;
            this.filteredUserName = this.userIdToName.get(userId);
            clearInterval(int);
        }, 50, event.currentTarget.dataset.id, this.userIdToAvatar.get(event.currentTarget.dataset.id));
    }

    userClickedActions = event => {
        this.filteredTrackedChanges = this.groupedTrackedChanges.get(event.currentTarget.dataset.id); 
        this.filteredPosts = this.filteredTrackedChanges;
        this.filteredActivities = this.groupedTeamActivities.get(event.currentTarget.dataset.id);
    }

    doIconClickActions = (userId, avatar) => {
        if( userId == this.currentIconId ){
            this.currentIconId = '';
            toggleClass(this.memberSection, ['member-section-reduced','member-section-full']);
            toggleClass(this.publisher, ['chatter-publisher-open', 'chatter-publisher-init', 'slds-scrollable_y']);
            for( let i = 0; i < this.memberDivs.length; i++){
                toggleClass(this.memberDivs[i], ['slds-hidden', 'slds-border_bottom']);
            }
            for( let i = 0; i < this.template.querySelectorAll('.member').length; i++ ){
                toggleClass(this.template.querySelectorAll('.member')[i], 'slds-border_bottom');
            }
        }else{
            this.deselectIcon();
            this.currentIconId = userId;
        }
        toggleClass(avatar, ['avatar-selected']);
    }

    deselectIcon = () => {
        if( this.template.querySelector('.avatar-selected') ){
            toggleClass(this.template.querySelector('.avatar-selected'),['avatar-selected']);
        }
        if( this.template.querySelector('.task-icon-selected') ){
            toggleClass(this.template.querySelector('.task-icon-selected'), ['task-icon-selected']);
            toggleClass(this.template.querySelector('.opp-icon'), ['opp-icon-selected']);
        }
    }

    scrollActions = event => {
        if( (event.currentTarget.scrollTop > 10 && !this.toggleDiv.className.includes('toggle-scroll')) || (event.currentTarget.scrollTop < 9 && this.toggleDiv.className.includes('toggle-scroll')) ){
            toggleClass(this.toggleDiv, ['toggle-scroll']);
        }
    }

    openMemberActivities = avatar => {
        for( let i = 0; i<this.memberDivs.length; i++ ){
            toggleClass(this.memberDivs[i], ['slds-hidden','slds-border_bottom']);
        }
        this.currentIconId = avatar.dataset.id;
        toggleClass(avatar, ['avatar-selected']);
        toggleClass(this.memberSection, ['member-section-reduced','member-section-full']);
        toggleClass(this.publisher, ['chatter-publisher-open','slds-scrollable_y','chatter-publisher-init']);
    }

    goToRecord = event => {
        window.open('/'+event.currentTarget.dataset.id, '_blank');
    }

    togglePostType = event => { 
        if( event.currentTarget.iconName.includes('opportunity') && !event.currentTarget.classList.contains('opp-icon-selected') ){
            if( this.template.querySelector('.task-icon-selected') ){
                toggleClass(this.template.querySelector('.task-icon-selected'), ['task-icon-selected']);
            }
           toggleClass(event.currentTarget, ['opp-icon-selected']);
        }else if( event.currentTarget.iconName.includes('task') && !event.currentTarget.classList.contains('task-icon-selected') ){
            if( this.template.querySelector('.opp-icon-selected') ){
                toggleClass(this.template.querySelector('.opp-icon-selected'), ['opp-icon-selected']);
            } 
            toggleClass(event.currentTarget, ['task-icon-selected']);
        }
        this.filteredPosts = (event.currentTarget.iconName.includes('task') ?  this.filteredActivities : this.filteredTrackedChanges);
    }

    getDateFromDateTime = dateTime => {
        return dateTime.substring(0, dateTime.indexOf('T'));
    }
}